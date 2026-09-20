import { type ReactElement } from "react"

import type StripeType from "stripe"
import { z } from "zod"

import {
  buildOrderAccountCta,
  buildOrderConfirmationDetails,
  buildOrderConfirmationItems,
  resolveStripePaymentMethodLabel,
} from "~/src/integrations/resend/order-confirmation.utils"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { STRIPE_CURRENCY, STRIPE_WEBHOOK_EVENTS } from "~/src/integrations/stripe/stripe.constants"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
import { isValidLocale } from "~/src/integrations/use-intl/i18n.utils"

import {
  recordEmailFailedAudit,
  recordEmailSentAudit,
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderPlacedAudit,
  recordOrderReleasedAudit,
} from "~/src/modules/audit-log/audit-log.events.server"
import {
  type CheckoutFulfillmentLine,
  checkoutFulfillmentLinesSchema,
  checkoutReleaseLinesSchema,
} from "~/src/modules/checkout/checkout-metadata.zod"
import { getCheckoutEmailContext } from "~/src/modules/checkout/checkout.accessors"
import { fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"
import { clearOrderDispute } from "~/src/modules/order/use-cases/clear-order-dispute"
import { flagOrderDispute } from "~/src/modules/order/use-cases/flag-order-dispute"
import { refundOrder } from "~/src/modules/order/use-cases/refund-order"

import { formatMinorUnitsAsDecimal } from "~/src/lib/currency"
import {
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
} from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

import { OrderConfirmation, getOrderConfirmationSubject } from "~/src/presentation/emails/order-confirmation"

const NO_AMOUNT = 0
const SINGLE_RESULT = 1
const DISPUTE_LOST = "lost"

/** A Stripe ref that may arrive expanded or as a bare id. Returns its id, or `undefined`. */
const refId = (ref: string | { id: string } | null): string | undefined => {
  if (ref === null) {
    return undefined
  }
  return typeof ref === "string" ? ref : ref.id
}

/**
 * Refunds and disputes reference the Charge/PaymentIntent, but our `payment`
 * rows are keyed by the Checkout Session id. This bridges the two by asking
 * Stripe which session owns the PaymentIntent.
 */
const resolveTransactionId = async (paymentIntent: string | { id: string } | null): Promise<string | undefined> => {
  const paymentIntentId = refId(paymentIntent)
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

const parseMetadataItems = (session: StripeType.Checkout.Session): string => session.metadata?.["items"] ?? "[]"

const resolveLocale = (session: StripeType.Checkout.Session): Locale => {
  const raw = session.metadata?.["locale"]
  return typeof raw === "string" && isValidLocale(raw) ? raw : DEFAULT_LOCALE
}

interface OrderConfirmationEmailPayload {
  readonly email: string
  readonly locale: Locale
  readonly react: ReactElement
  readonly subject: string
}

const recordOrderConfirmationEmailOutcome = (
  orderId: string,
  email: string,
  outcome: Readonly<{ error?: unknown; rejectedMessage?: string | undefined }>,
): void => {
  const detailPrefix = `Order confirmation → ${email}`

  if (outcome.error !== undefined) {
    console.error(`Order confirmation email failed for ${orderId}:`, outcome.error)
    recordEmailFailedAudit(orderId, { detail: detailPrefix, resourceId: orderId })
    return
  }

  if (outcome.rejectedMessage !== undefined) {
    console.error(`Order confirmation email rejected for ${orderId}: ${outcome.rejectedMessage}`)
    recordEmailFailedAudit(orderId, { detail: `${detailPrefix} — ${outcome.rejectedMessage}`, resourceId: orderId })
    return
  }

  recordEmailSentAudit(orderId, { detail: detailPrefix, resourceId: orderId })
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
  const paymentMethod = await resolveStripePaymentMethodLabel(session, locale)
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
    locale,
    paymentMethod,
  )
  const itemsSubtotal = order.lines.reduce((sum, line) => sum + line.price * line.qty, NO_AMOUNT)
  const shippingTotal = Math.max((session.amount_total ?? NO_AMOUNT) - itemsSubtotal, NO_AMOUNT)
  const emailItems = buildOrderConfirmationItems(order.lines, locale)
  const rawUserId = session.metadata?.["userId"]
  const isGuest = rawUserId === undefined || rawUserId === ""
  const accountCta = buildOrderAccountCta(locale, order.orderId, isGuest)

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
        orderId={order.orderId}
        shippingTotal={shippingTotal}
        subtotal={itemsSubtotal}
        total={session.amount_total ?? NO_AMOUNT}
      />
    ),
    subject: getOrderConfirmationSubject(locale),
  }
}

/** Emails the buyer their order confirmation. Best-effort: a failed send is logged, never thrown. */
const notifyOrderConfirmed = async (
  session: StripeType.Checkout.Session,
  order: Readonly<{ currency: string; lines: CheckoutFulfillmentLine[]; orderId: string }>,
): Promise<void> => {
  const payload = await buildOrderConfirmationEmailPayload(session, order)
  if (payload === undefined) {
    return
  }

  const [response, error] = await sendEmail({
    react: payload.react,
    subject: payload.subject,
    to: payload.email,
  })

  recordOrderConfirmationEmailOutcome(order.orderId, payload.email, {
    error,
    rejectedMessage: response?.error?.message ?? undefined,
  })
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
    amount: session.amount_total ?? NO_AMOUNT,
    currency,
    lines,
    locale,
    transactionId: session.id,
  })

  // `fulfillCheckout` is idempotent: a defined orderId means THIS event created the order.
  // The confirmation email is therefore sent exactly once.
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

/**
 * A card decline keeps the Checkout Session open and retryable, so this is NOT
 * a terminal state: we deliberately do NOT release inventory here (that would
 * free stock while the shopper is mid-retry). Reservations are reclaimed when
 * the session ends — `checkout.session.expired` / `async_payment_failed`. We
 * handle the event purely for observability / support follow-up.
 */
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

  // A lost dispute is a forced reversal of funds: record it as a refund, but do
  // NOT restock — the goods were almost certainly shipped and not returned.
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
    await handleFulfillCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_EXPIRED]: async (event) => {
    await handleReleaseCheckoutSession(z.custom<StripeType.Checkout.Session>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED]: async (event) => {
    await handlePaymentIntentFailed(z.custom<StripeType.PaymentIntent>().parse(event.data.object))
  },
}
