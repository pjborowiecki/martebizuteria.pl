import { type ReactElement } from "react"

import type StripeType from "stripe"
import { createTranslator } from "use-intl"
import { z } from "zod"

import {
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import {
  buildOrderAccountCta,
  buildOrderConfirmationDetails,
  buildOrderConfirmationItems,
  resolveStripePaymentMethodLabel,
} from "~/src/integrations/resend/order-confirmation.utils"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { STRIPE_CURRENCY, STRIPE_WEBHOOK_EVENTS } from "~/src/integrations/stripe/stripe.constants"
import { deleteCheckoutCoupons } from "~/src/integrations/stripe/stripe.coupons.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"
import { formatMinorUnitsAsDecimal } from "~/src/modules/_core/utils/currency"
import {
  recordEmailFailedAudit,
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderEmailOutcome,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderPlacedAudit,
  recordOrderReleasedAudit,
} from "~/src/modules/audit-log/audit-log.events.server"
import {
  type CheckoutFulfillmentLine,
  checkoutFulfillmentLinesSchema,
  checkoutReleaseLinesSchema,
  readCheckoutSessionItemsJson,
} from "~/src/modules/checkout/checkout-metadata.zod"
import { getCheckoutEmailContext } from "~/src/modules/checkout/checkout.accessors"
import { fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"
import { getOrderTotalsForEmail } from "~/src/modules/order/order.accessors"
import { clearOrderDispute } from "~/src/modules/order/use-cases/clear-order-dispute"
import { flagOrderDispute } from "~/src/modules/order/use-cases/flag-order-dispute"
import { refundOrder } from "~/src/modules/order/use-cases/refund-order"

import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"
import { ORDER_CONFIRMATION_NAMESPACE, OrderConfirmation } from "~/src/presentation/emails/order-confirmation"

const NO_AMOUNT = 0

const SINGLE_RESULT = 1

const DISPUTE_LOST = "lost"

const resolveTransactionId = async (paymentIntent: string | { id: string } | null): Promise<string | undefined> => {
  const paymentIntentId = resolveStripeObjectId(paymentIntent)
  if (paymentIntentId === undefined) {
    return undefined
  }

  const sessions = await stripe.checkout.sessions.list({
    limit: SINGLE_RESULT,
    payment_intent: paymentIntentId,
  })

  const [session] = sessions.data

  return session?.id
}

const FULFILLABLE_PAYMENT_STATUSES = new Set<StripeType.Checkout.Session["payment_status"]>(["no_payment_required", "paid"])

const parseMetadataItems = (session: StripeType.Checkout.Session): string => readCheckoutSessionItemsJson(session.metadata)

const resolveLocale = (session: StripeType.Checkout.Session): SupportedLocale => {
  const raw = session.metadata?.["locale"]

  return typeof raw === "string" && isSupportedLocale(raw) ? raw : I18N.DEFAULT_LOCALE
}

interface OrderConfirmationEmailPayload {
  readonly email: string
  readonly locale: SupportedLocale
  readonly react: ReactElement
  readonly subject: string
}

const buildOrderConfirmationEmailPayload = async (
  session: StripeType.Checkout.Session,
  order: Readonly<{ currency: string; lines: CheckoutFulfillmentLine[]; orderId: string }>,
): Promise<OrderConfirmationEmailPayload | undefined> => {
  const email = session.customer_email ?? session.customer_details?.email
  if (email === null || email === undefined || email === "") {
    return undefined
  }

  const locale = resolveLocale(session)
  const checkoutId = session.metadata?.["checkoutId"]
  const checkoutContext = typeof checkoutId === "string" && checkoutId !== "" ? await getCheckoutEmailContext(checkoutId) : undefined
  const messages = await loadNamespace<typeof orderConfirmationMessages>({ locale, namespace: ORDER_CONFIRMATION_NAMESPACE })
  const paymentMethod = await resolveStripePaymentMethodLabel(session, messages)
  const details = buildOrderConfirmationDetails(
    checkoutContext === undefined
      ? undefined
      : {
          billingAddress: checkoutContext.billingAddress,
          billingAddressId: checkoutContext.billingAddressId,
          customerNote: checkoutContext.customerNote,
          deliveryMethod: checkoutContext.deliveryMethod,
          lockerId: checkoutContext.lockerId,
          shippingAddress: checkoutContext.shippingAddress,
          shippingAddressId: checkoutContext.shippingAddressId,
        },
    paymentMethod,
    messages,
  )

  const totals = await getOrderTotalsForEmail(order.orderId)
  const emailItems = buildOrderConfirmationItems(order.lines, locale)
  const rawUserId = session.metadata?.["userId"]
  const isGuest = rawUserId === undefined || rawUserId === ""
  const accountCta = buildOrderAccountCta({ isGuest, locale, messages, orderId: order.orderId })

  return {
    email,
    locale,
    react: (
      <OrderConfirmation
        accountCta={accountCta}
        currency={order.currency}
        details={details}
        items={emailItems}
        locale={locale}
        messages={messages}
        discountTotal={totals?.discountTotal ?? NO_AMOUNT}
        orderNumber={totals?.orderNumber ?? order.orderId}
        shippingTotal={totals?.shippingTotal ?? NO_AMOUNT}
        subtotal={totals?.subtotal ?? NO_AMOUNT}
        taxBasisPoints={totals?.taxBasisPoints ?? STANDARD_VAT_BASIS_POINTS}
        taxTotal={totals?.taxTotal ?? NO_AMOUNT}
        total={totals?.total ?? session.amount_total ?? NO_AMOUNT}
      />
    ),
    subject: createTranslator({ locale, messages })("subject"),
  }
}

const notifyOrderConfirmed = async (
  session: StripeType.Checkout.Session,
  order: Readonly<{ currency: string; lines: CheckoutFulfillmentLine[]; orderId: string }>,
): Promise<void> => {
  try {
    const payload = await buildOrderConfirmationEmailPayload(session, order)
    if (payload === undefined) {
      return
    }

    const failure = await sendEmail({
      react: payload.react,
      subject: payload.subject,
      to: payload.email,
    })

    recordOrderEmailOutcome({ failure, label: `Order confirmation → ${payload.email}`, orderId: order.orderId })
  } catch (error: unknown) {
    console.error(`Order ${order.orderId} confirmation email could not be prepared:`, error)
    recordEmailFailedAudit(order.orderId, {
      detail: error instanceof Error ? error.message : "Unknown error",
      resourceId: order.orderId,
    })
  }
}

const handleFulfillCheckoutSession = async (session: StripeType.Checkout.Session): Promise<void> => {
  if (!FULFILLABLE_PAYMENT_STATUSES.has(session.payment_status)) {
    console.info(`Session ${session.id} completed with payment_status=${session.payment_status}; awaiting async settlement.`)

    return
  }

  const lines = checkoutFulfillmentLinesSchema.parse(JSON.parse(parseMetadataItems(session)))
  const currency = (session.currency ?? STRIPE_CURRENCY).toUpperCase()
  const locale = resolveLocale(session)
  const orderId = await fulfillCheckout({
    currency,
    lines,
    locale,
    paidAmount: session.amount_total ?? NO_AMOUNT,
    transactionId: session.id,
  })

  if (orderId === undefined) {
    return
  }
  console.info(`Checkout converted to Order ${orderId} from session ${session.id}.`)

  recordOrderPlacedAudit(orderId, {
    detail: session.customer_email ?? session.customer_details?.email ?? undefined,
    resourceId: orderId,
  })
  recordOrderPaymentCapturedAudit(orderId, {
    detail: `${formatMinorUnitsAsDecimal(session.amount_total ?? NO_AMOUNT, { currencyCode: currency, locale, useGrouping: false })} ${currency.toUpperCase()}`,
    resourceId: orderId,
  })
  scheduleAdminOrdersInvalidation()
  scheduleProductCatalogInvalidation()

  await notifyOrderConfirmed(session, { currency, lines, orderId })
}

const handleReleaseCheckoutSession = async (session: StripeType.Checkout.Session): Promise<void> => {
  const lines = checkoutReleaseLinesSchema.parse(JSON.parse(parseMetadataItems(session)))
  await releaseCheckout({ lines, transactionId: session.id })
  recordOrderReleasedAudit(session.id, { resourceId: session.id })
  scheduleProductCatalogInvalidation()
  console.info(`Checkout released after failed/expired session ${session.id}.`)
}

const handlePaymentIntentFailed = (paymentIntent: StripeType.PaymentIntent): Promise<void> => {
  const reason = paymentIntent.last_payment_error?.message ?? "unknown"
  recordOrderPaymentFailedAudit(paymentIntent.id, { detail: reason, resourceId: paymentIntent.id })
  console.warn(`Payment failed for intent ${paymentIntent.id} (checkout ${paymentIntent.metadata["checkoutId"] ?? "?"}): ${reason}`)

  return Promise.resolve()
}

const handleChargeRefunded = async (charge: StripeType.Charge): Promise<void> => {
  const transactionId = await resolveTransactionId(charge.payment_intent)
  if (transactionId === undefined) {
    console.info(`Charge ${charge.id} refunded but no Checkout Session resolved; skipping.`)

    return
  }

  await refundOrder({
    fullyRefunded: charge.amount_refunded >= charge.amount,
    refundedAmount: charge.amount_refunded,
    restock: true,
    transactionId,
  })
  scheduleAdminOrdersInvalidation()
  scheduleProductCatalogInvalidation()
  console.info(`Recorded refund of ${charge.amount_refunded} for charge ${charge.id}.`)
}

const handleChargeDisputeCreated = async (dispute: StripeType.Dispute): Promise<void> => {
  const transactionId = await resolveTransactionId(dispute.payment_intent)
  if (transactionId === undefined) {
    console.warn(`Dispute ${dispute.id} created but no Checkout Session resolved; skipping.`)

    return
  }

  await flagOrderDispute(transactionId, {
    amount: dispute.amount,
    id: dispute.id,
    reason: dispute.reason,
    status: dispute.status,
  })
  recordOrderDisputeOpenedAudit(transactionId, {
    detail: `${dispute.reason} — ${dispute.status}`,
    resourceId: transactionId,
  })
  scheduleAdminOrdersInvalidation()
  console.warn(`Dispute ${dispute.id} (${dispute.reason}) opened; order frozen pending resolution.`)
}

const handleChargeDisputeClosed = async (dispute: StripeType.Dispute): Promise<void> => {
  const transactionId = await resolveTransactionId(dispute.payment_intent)
  if (transactionId === undefined) {
    console.info(`Dispute ${dispute.id} closed but no Checkout Session resolved; skipping.`)

    return
  }

  if (dispute.status === DISPUTE_LOST) {
    await refundOrder({
      fullyRefunded: true,
      refundedAmount: dispute.amount,
      restock: false,
      transactionId,
    })
    scheduleAdminOrdersInvalidation()
    console.warn(`Dispute ${dispute.id} lost; order marked refunded — review inventory manually.`)

    return
  }

  await clearOrderDispute(transactionId)
  recordOrderDisputeClosedAudit(transactionId, { detail: dispute.status, resourceId: transactionId })
  scheduleAdminOrdersInvalidation()
  console.info(`Dispute ${dispute.id} closed (${dispute.status}); dispute flag cleared.`)
}

export const webhookHandlers: Record<string, (event: StripeType.Event) => Promise<void>> = {
  [STRIPE_WEBHOOK_EVENTS.CHARGE_DISPUTE_CLOSED]: async (event) => {
    await handleChargeDisputeClosed(z.custom<StripeType.Dispute>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.CHARGE_DISPUTE_CREATED]: async (event) => {
    await handleChargeDisputeCreated(z.custom<StripeType.Dispute>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.CHARGE_REFUNDED]: async (event) => {
    await handleChargeRefunded(z.custom<StripeType.Charge>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED]: async (event) => {
    await handleReleaseCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED]: async (event) => {
    await handleFulfillCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED]: async (event) => {
    const session = z.custom<StripeType.Checkout.Session>().parse(event.data.object)
    await handleFulfillCheckoutSession(session)
    await deleteCheckoutCoupons({ checkoutId: session.metadata?.["checkoutId"], discounts: session.discounts })
  },
  [STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_EXPIRED]: async (event) => {
    const session = z.custom<StripeType.Checkout.Session>().parse(event.data.object)
    await handleReleaseCheckoutSession(session)
    await deleteCheckoutCoupons({ checkoutId: session.metadata?.["checkoutId"], discounts: session.discounts })
  },
  [STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED]: async (event) => {
    await handlePaymentIntentFailed(z.custom<StripeType.PaymentIntent>().parse(event.data.object))
  },
}
