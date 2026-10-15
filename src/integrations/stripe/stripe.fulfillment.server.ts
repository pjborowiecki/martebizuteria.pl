import type StripeType from "stripe"

import {
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formatMinorUnitsAsDecimal } from "~/src/modules/_core/utils/currency"
import { recordOrderPaymentCapturedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import {
  parseCheckoutSessionFulfillmentLines,
  resolveCheckoutSessionCurrency,
  resolveCheckoutSessionLocale,
} from "~/src/modules/checkout/checkout-metadata.zod"
import { fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"
import { sendNewOrderEmail } from "~/src/modules/order/use-cases/send-new-order-email.server"
import { sendOrderConfirmationEmail } from "~/src/modules/order/use-cases/send-order-confirmation-email.server"

import { scheduleBackgroundWork } from "~/src/lib/background"

const NO_AMOUNT = 0

export const FULFILLABLE_PAYMENT_STATUSES = new Set<StripeType.Checkout.Session["payment_status"]>(["no_payment_required", "paid"])

export const formatPaidAmount = (amountMinorUnits: number, currency: string, locale: SupportedLocale): string =>
  `${formatMinorUnitsAsDecimal(amountMinorUnits, { currencyCode: currency, locale, useGrouping: false })} ${currency}`

export const createOrderFromPaidSession = async (session: StripeType.Checkout.Session): Promise<string | undefined> => {
  const orderId = await fulfillCheckout({
    currency: resolveCheckoutSessionCurrency(session),
    lines: parseCheckoutSessionFulfillmentLines(session),
    locale: resolveCheckoutSessionLocale(session),
    paidAmount: session.amount_total ?? NO_AMOUNT,
    transactionId: session.id,
  })

  return orderId
}

export const announcePlacedOrder = (session: StripeType.Checkout.Session, orderId: string): Promise<readonly unknown[]> => {
  console.info(`Checkout converted to Order ${orderId} from session ${session.id}.`)
  recordOrderPaymentCapturedAudit(orderId, {
    detail: formatPaidAmount(
      session.amount_total ?? NO_AMOUNT,
      resolveCheckoutSessionCurrency(session),
      resolveCheckoutSessionLocale(session),
    ),
    resourceId: orderId,
  })
  scheduleAdminOrdersInvalidation()
  scheduleProductCatalogInvalidation()

  return Promise.all([sendOrderConfirmationEmail(session, orderId), sendNewOrderEmail(orderId, session.return_url)])
}

export const fulfillReturnedCheckoutSession = async (sessionId: string): Promise<void> => {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.status !== "complete" || !FULFILLABLE_PAYMENT_STATUSES.has(session.payment_status)) {
    return
  }

  const orderId = await createOrderFromPaidSession(session).catch((error: unknown) => {
    console.error(`Paid Checkout Session ${session.id} created no order from its return page:`, error)
  })
  if (orderId !== undefined) {
    scheduleBackgroundWork(announcePlacedOrder(session, orderId))
  }
}
