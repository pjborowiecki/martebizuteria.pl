import { type ReactElement } from "react"

import { type Attachment } from "resend"
import type StripeType from "stripe"
import { createTranslator } from "use-intl"
import { z } from "zod"

import {
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { notifyShopOfIncident } from "~/src/integrations/resend/incident-alert.notification.server"
import { notifyShopOfNewOrder } from "~/src/integrations/resend/new-order.notification.server"
import {
  buildOrderAccountCta,
  buildOrderConfirmationDetails,
  buildOrderConfirmationItems,
  buildOrderLegalLinks,
  resolveStripePaymentMethodLabel,
} from "~/src/integrations/resend/order-confirmation.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/integrations/resend/order-email.delivery.server"
import { resolveOrderLineFulfillmentTimes } from "~/src/integrations/resend/order-fulfillment-time.utils"
import { notifyOrderRefunded } from "~/src/integrations/resend/order-refunded.notification.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadWithdrawalFormAttachment } from "~/src/integrations/resend/withdrawal-form.attachment.server"
import { STRIPE_CURRENCY, STRIPE_WEBHOOK_EVENTS } from "~/src/integrations/stripe/stripe.constants"
import { deleteCheckoutCoupons } from "~/src/integrations/stripe/stripe.coupons.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"
import { formatMinorUnitsAsDecimal } from "~/src/modules/_core/utils/currency"
import { getFulfillmentTimeAttributesByVariantId } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import {
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderFulfillmentFailedAudit,
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
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { clearOrderDispute } from "~/src/modules/order/use-cases/clear-order-dispute"
import { flagOrderDispute } from "~/src/modules/order/use-cases/flag-order-dispute"
import { refundOrder } from "~/src/modules/order/use-cases/refund-order"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { resolveDeploymentOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"

import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"
import type paymentFailedMessages from "~/messages/en-US/emails.payment-failed.json"
import { ORDER_CONFIRMATION_NAMESPACE, OrderConfirmation } from "~/src/presentation/emails/order-confirmation"
import { PAYMENT_FAILED_NAMESPACE, PaymentFailed } from "~/src/presentation/emails/payment-failed"
import { ROUTES } from "~/src/routes"

const NO_AMOUNT = 0

const SINGLE_RESULT = 1

const DISPUTE_LOST = "lost"

const resolveCheckoutSession = async (paymentIntent: string | { id: string } | null): Promise<StripeType.Checkout.Session | undefined> => {
  const paymentIntentId = resolveStripeObjectId(paymentIntent)
  if (paymentIntentId === undefined) {
    return undefined
  }

  const sessions = await stripe.checkout.sessions.list({
    limit: SINGLE_RESULT,
    payment_intent: paymentIntentId,
  })

  const [session] = sessions.data

  return session
}

const FULFILLABLE_PAYMENT_STATUSES = new Set<StripeType.Checkout.Session["payment_status"]>(["no_payment_required", "paid"])

const parseFulfillmentLines = (session: StripeType.Checkout.Session): CheckoutFulfillmentLine[] =>
  checkoutFulfillmentLinesSchema.parse(JSON.parse(readCheckoutSessionItemsJson(session.metadata)))

const resolveCurrency = (session: StripeType.Checkout.Session): string => (session.currency ?? STRIPE_CURRENCY).toUpperCase()

const resolveLocale = (session: StripeType.Checkout.Session): SupportedLocale => {
  const raw = session.metadata?.["locale"]

  return typeof raw === "string" && isSupportedLocale(raw) ? raw : I18N.DEFAULT_LOCALE
}

interface OrderConfirmationEmailPayload {
  readonly attachments: Attachment[]
  readonly email: string
  readonly locale: SupportedLocale
  readonly react: ReactElement
  readonly subject: string
}

const buildOrderConfirmationEmailPayload = async (
  session: StripeType.Checkout.Session,
  order: Readonly<{ currency: string; lines: CheckoutFulfillmentLine[]; orderId: string }>,
  origin: string,
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
  const fulfillmentTimeAttributes = await getFulfillmentTimeAttributesByVariantId(order.lines.map((line) => line.variantId))
  const details = buildOrderConfirmationDetails({
    context:
      checkoutContext === undefined
        ? undefined
        : {
            billingAddress: checkoutContext.billingAddress,
            billingAddressId: checkoutContext.billingAddressId,
            billingCompanyName: checkoutContext.billingCompanyName,
            billingNip: checkoutContext.billingNip,
            customerNote: checkoutContext.customerNote,
            deliveryMethod: checkoutContext.deliveryMethod,
            lockerId: checkoutContext.lockerId,
            shippingAddress: checkoutContext.shippingAddress,
            shippingAddressId: checkoutContext.shippingAddressId,
          },
    fulfillmentTimes: resolveOrderLineFulfillmentTimes(order.lines, fulfillmentTimeAttributes, locale),
    messages,
    paymentMethod,
  })

  const totals = await getOrderTotalsForEmail(order.orderId)
  const emailItems = buildOrderConfirmationItems(order.lines, locale, origin)
  const rawUserId = session.metadata?.["userId"]
  const isGuest = rawUserId === undefined || rawUserId === ""
  const accountCta = buildOrderAccountCta({ isGuest, locale, messages, orderId: order.orderId, origin })
  const orderNumber = totals?.orderNumber ?? order.orderId

  return {
    attachments: [await loadWithdrawalFormAttachment(origin)],
    email,
    locale,
    react: (
      <OrderConfirmation
        accountCta={accountCta}
        currency={order.currency}
        details={details}
        items={emailItems}
        legalLinks={buildOrderLegalLinks(origin, locale, orderNumber)}
        locale={locale}
        messages={messages}
        discountTotal={totals?.discountTotal ?? NO_AMOUNT}
        orderNumber={orderNumber}
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

const ORDER_CONFIRMATION_LABEL = "Order confirmation"

const sendOrderConfirmationEmail = async (
  session: StripeType.Checkout.Session,
  orderId: string,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
  if (session.return_url === undefined) {
    return { failure: "The Stripe session has no return URL to link the email to", label: ORDER_CONFIRMATION_LABEL }
  }

  const order = { currency: resolveCurrency(session), lines: parseFulfillmentLines(session), orderId }
  const payload = await buildOrderConfirmationEmailPayload(session, order, resolveDeploymentOrigin(session.return_url))
  if (payload === undefined) {
    return { failure: "The Stripe session has no email address", label: ORDER_CONFIRMATION_LABEL }
  }

  const failure = await sendEmail({
    attachments: payload.attachments,
    idempotencyKey,
    react: payload.react,
    subject: payload.subject,
    to: payload.email,
  })

  return { failure, label: `${ORDER_CONFIRMATION_LABEL} → ${payload.email}` }
}

export const notifyOrderConfirmed = (session: StripeType.Checkout.Session, orderId: string): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => sendOrderConfirmationEmail(session, orderId, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.CONFIRMATION}/${orderId}`,
    label: ORDER_CONFIRMATION_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.CONFIRMATION },
    orderId,
  })

const PAYMENT_FAILED_LABEL = "Payment failed"

const sendPaymentFailedEmail = async (session: StripeType.Checkout.Session, idempotencyKey: string): Promise<OrderEmailOutcome> => {
  if (session.return_url === undefined) {
    return { failure: "The Stripe session has no return URL to link the email to", label: PAYMENT_FAILED_LABEL }
  }

  const email = session.customer_email ?? session.customer_details?.email
  if (email === null || email === undefined || email === "") {
    return { failure: "The Stripe session has no email address", label: PAYMENT_FAILED_LABEL }
  }

  const origin = resolveDeploymentOrigin(session.return_url)
  const locale = resolveLocale(session)
  const messages = await loadNamespace<typeof paymentFailedMessages>({ locale, namespace: PAYMENT_FAILED_NAMESPACE })
  const lines = parseFulfillmentLines(session)
  const failure = await sendEmail({
    idempotencyKey,
    react: (
      <PaymentFailed
        amount={session.amount_total}
        currency={session.currency}
        items={buildOrderConfirmationItems(lines, locale, origin)}
        locale={locale}
        messages={messages}
        shopUrl={buildLocalizedUrl(origin, ROUTES.PRODUCTS, locale)}
      />
    ),
    subject: createTranslator({ locale, messages })("subject"),
    to: email,
  })

  return { failure, label: `${PAYMENT_FAILED_LABEL} → ${email}` }
}

const formatPaidAmount = (amountMinorUnits: number, currency: string, locale: SupportedLocale): string =>
  `${formatMinorUnitsAsDecimal(amountMinorUnits, { currencyCode: currency, locale, useGrouping: false })} ${currency}`

const describeUnfulfilledPaidSession = (session: StripeType.Checkout.Session, currency: string, error: unknown): string => {
  const payer = session.customer_email ?? session.customer_details?.email ?? undefined
  const facts = [
    session.amount_total === null ? undefined : formatPaidAmount(session.amount_total, currency, resolveLocale(session)),
    payer,
    error instanceof Error ? error.message : String(error),
  ]

  return facts.filter((fact): fact is string => fact !== undefined).join(" — ")
}

const createOrderFromPaidSession = async (session: StripeType.Checkout.Session, currency: string): Promise<string | undefined> => {
  const lines = parseFulfillmentLines(session)
  const orderId = await fulfillCheckout({
    currency,
    lines,
    locale: resolveLocale(session),
    paidAmount: session.amount_total ?? NO_AMOUNT,
    transactionId: session.id,
  })

  return orderId
}

const handleFulfillCheckoutSession = async (session: StripeType.Checkout.Session): Promise<void> => {
  if (!FULFILLABLE_PAYMENT_STATUSES.has(session.payment_status)) {
    console.info(`Session ${session.id} completed with payment_status=${session.payment_status}; awaiting async settlement.`)

    return
  }

  const currency = resolveCurrency(session)
  const locale = resolveLocale(session)
  const orderId = await createOrderFromPaidSession(session, currency).catch((error: unknown) => {
    console.error(`Paid Checkout Session ${session.id} created no order:`, error)
    const detail = describeUnfulfilledPaidSession(session, currency, error)
    recordOrderFulfillmentFailedAudit(session.id, { detail })
    if (errorCode(error) === ERROR_CODES.NOT_FOUND) {
      scheduleBackgroundWork(notifyShopOfIncident({ detail, kind: "paidCheckoutWithoutOrder", reference: session.id }))

      return
    }

    throw error
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
    detail: formatPaidAmount(session.amount_total ?? NO_AMOUNT, currency, locale),
    resourceId: orderId,
  })
  scheduleAdminOrdersInvalidation()
  scheduleProductCatalogInvalidation()

  const orderEmailDeliveries = Promise.all([notifyOrderConfirmed(session, orderId), notifyShopOfNewOrder(orderId, session.return_url)])
  scheduleBackgroundWork(orderEmailDeliveries)
  await orderEmailDeliveries
}

const handleReleaseCheckoutSession = async (session: StripeType.Checkout.Session): Promise<boolean> => {
  const lines = checkoutReleaseLinesSchema.parse(JSON.parse(readCheckoutSessionItemsJson(session.metadata)))
  const released = await releaseCheckout({ lines, transactionId: session.id })
  recordOrderReleasedAudit(session.id, { resourceId: session.id })
  scheduleProductCatalogInvalidation()
  console.info(`Checkout released after failed/expired session ${session.id}.`)

  return released
}

const handleAsyncPaymentFailed = async (session: StripeType.Checkout.Session): Promise<void> => {
  if (!(await handleReleaseCheckoutSession(session))) {
    return
  }

  const paymentFailedEmailDelivery = deliverOrderEmail((idempotencyKey) => sendPaymentFailedEmail(session, idempotencyKey), {
    idempotencyKey: `payment-failed/${session.id}`,
    label: PAYMENT_FAILED_LABEL,
    orderId: session.id,
  })
  scheduleBackgroundWork(paymentFailedEmailDelivery)
  await paymentFailedEmailDelivery
}

const handlePaymentIntentFailed = (paymentIntent: StripeType.PaymentIntent): Promise<void> => {
  const reason = paymentIntent.last_payment_error?.message ?? "unknown"
  recordOrderPaymentFailedAudit(paymentIntent.id, { detail: reason, resourceId: paymentIntent.id })
  console.warn(`Payment failed for intent ${paymentIntent.id} (checkout ${paymentIntent.metadata["checkoutId"] ?? "?"}): ${reason}`)

  return Promise.resolve()
}

const handleChargeRefunded = async (charge: StripeType.Charge): Promise<void> => {
  const session = await resolveCheckoutSession(charge.payment_intent)
  if (session === undefined) {
    console.info(`Charge ${charge.id} refunded but no Checkout Session resolved; skipping.`)

    return
  }

  const unannouncedRefund = await refundOrder({
    fullyRefunded: charge.amount_refunded >= charge.amount,
    refundedAmount: charge.amount_refunded,
    transactionId: session.id,
  })
  scheduleAdminOrdersInvalidation()
  console.info(`Recorded refund of ${charge.amount_refunded} for charge ${charge.id}.`)
  if (unannouncedRefund === undefined) {
    return
  }

  const refundEmailDelivery = notifyOrderRefunded(unannouncedRefund, session.return_url)
  scheduleBackgroundWork(refundEmailDelivery)
  await refundEmailDelivery
}

const handleChargeDisputeCreated = async (dispute: StripeType.Dispute): Promise<void> => {
  const session = await resolveCheckoutSession(dispute.payment_intent)
  const transactionId = session?.id
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
  const session = await resolveCheckoutSession(dispute.payment_intent)
  const transactionId = session?.id
  if (transactionId === undefined) {
    console.info(`Dispute ${dispute.id} closed but no Checkout Session resolved; skipping.`)

    return
  }

  if (dispute.status === DISPUTE_LOST) {
    await refundOrder({
      fullyRefunded: true,
      refundedAmount: dispute.amount,
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
    await handleAsyncPaymentFailed(z.custom<StripeType.Checkout.Session>().parse(event.data.object))
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
