import type StripeType from "stripe"
import { z } from "zod"

import {
  scheduleAdminOrdersInvalidation,
  scheduleProductCatalogInvalidation,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { STRIPE_WEBHOOK_EVENTS } from "~/src/integrations/stripe/stripe.constants"
import { deleteCheckoutCoupons } from "~/src/integrations/stripe/stripe.coupons.server"
import {
  FULFILLABLE_PAYMENT_STATUSES,
  announcePlacedOrder,
  createOrderFromPaidSession,
  formatPaidAmount,
} from "~/src/integrations/stripe/stripe.fulfillment.server"
import { isUndoneRefund, readStandingRefunds } from "~/src/integrations/stripe/stripe.refunds.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import {
  recordOrderDisputeClosedAudit,
  recordOrderDisputeOpenedAudit,
  recordOrderFulfillmentFailedAudit,
  recordOrderPaymentFailedAudit,
  recordOrderReleasedAudit,
} from "~/src/modules/audit-log/audit-log.events.server"
import { resolveCheckoutSessionCurrency, resolveCheckoutSessionLocale } from "~/src/modules/checkout/checkout-metadata.zod"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"
import { sendPaymentFailedEmail } from "~/src/modules/checkout/use-cases/send-payment-failed-email.server"
import { clearOrderDispute } from "~/src/modules/order/use-cases/clear-order-dispute"
import { flagOrderDispute } from "~/src/modules/order/use-cases/flag-order-dispute"
import { refundOrder } from "~/src/modules/order/use-cases/refund-order"
import { sendOrderRefundedEmail } from "~/src/modules/order/use-cases/send-order-refunded-email.server"
import { lowerRefundedAmount, undoFailedRefund } from "~/src/modules/order/use-cases/undo-failed-refund"
import { getHeldLinesByTransactionId } from "~/src/modules/payment/payment.accessors"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { sendIncidentAlert } from "~/src/lib/incident-alert.server"

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

const describeUnfulfilledPaidSession = (session: StripeType.Checkout.Session, error: unknown): string => {
  const payer = session.customer_email ?? session.customer_details?.email ?? undefined
  const facts = [
    session.amount_total === null
      ? undefined
      : formatPaidAmount(session.amount_total, resolveCheckoutSessionCurrency(session), resolveCheckoutSessionLocale(session)),
    payer,
    error instanceof Error ? error.message : String(error),
  ]

  return facts.filter((fact): fact is string => fact !== undefined).join(" — ")
}

const handleFulfillCheckoutSession = async (session: StripeType.Checkout.Session): Promise<void> => {
  if (!FULFILLABLE_PAYMENT_STATUSES.has(session.payment_status)) {
    console.info(`Session ${session.id} completed with payment_status=${session.payment_status}; awaiting async settlement.`)

    return
  }

  const orderId = await createOrderFromPaidSession(session).catch((error: unknown) => {
    console.error(`Paid Checkout Session ${session.id} created no order:`, error)
    const detail = describeUnfulfilledPaidSession(session, error)
    recordOrderFulfillmentFailedAudit(session.id, { detail })
    if (errorCode(error) === ERROR_CODES.NOT_FOUND) {
      scheduleBackgroundWork(sendIncidentAlert({ detail, kind: "paidCheckoutWithoutOrder", reference: session.id }))

      return
    }

    throw error
  })

  if (orderId === undefined) {
    return
  }

  const orderEmailDeliveries = announcePlacedOrder(session, orderId)
  scheduleBackgroundWork(orderEmailDeliveries)
  await orderEmailDeliveries
}

const handleReleaseCheckoutSession = async (session: StripeType.Checkout.Session): Promise<boolean> => {
  const lines = await getHeldLinesByTransactionId(session.id)
  const released = await releaseCheckout({ lines, transactionId: session.id })
  if (!released) {
    console.info(`Session ${session.id} held nothing to release: its checkout was paid, released or moved to a newer session.`)

    return false
  }

  recordOrderReleasedAudit(session.id, { resourceId: session.id })
  scheduleProductCatalogInvalidation()
  console.info(`Checkout released after failed/expired session ${session.id}.`)

  return true
}

const handleAsyncPaymentFailed = async (session: StripeType.Checkout.Session): Promise<void> => {
  if (!(await handleReleaseCheckoutSession(session))) {
    return
  }

  const paymentFailedEmailDelivery = sendPaymentFailedEmail(session)
  scheduleBackgroundWork(paymentFailedEmailDelivery)
  await paymentFailedEmailDelivery
}

const handlePaymentIntentFailed = (paymentIntent: StripeType.PaymentIntent): Promise<void> => {
  const reason = paymentIntent.last_payment_error?.message ?? "unknown"
  recordOrderPaymentFailedAudit(paymentIntent.id, { detail: reason, resourceId: paymentIntent.id })
  console.warn(`Payment failed for intent ${paymentIntent.id} (checkout ${paymentIntent.metadata["checkoutId"] ?? "?"}): ${reason}`)

  return Promise.resolve()
}

const lowerRefundsFailedMeanwhile = async (chargeId: string, transactionId: string, recordedTotal: number): Promise<boolean> => {
  const { total } = await readStandingRefunds(chargeId)
  if (total >= recordedTotal) {
    return false
  }

  await lowerRefundedAmount({ refundedAmount: total, transactionId })
  console.warn(
    `A refund of charge ${chargeId} failed while it was recorded; the payment records ${total} and the customer was not emailed.`,
  )

  return true
}

const handleChargeRefunded = async (charge: StripeType.Charge): Promise<void> => {
  const session = await resolveCheckoutSession(charge.payment_intent)
  if (session === undefined) {
    console.info(`Charge ${charge.id} refunded but no Checkout Session resolved; skipping.`)

    return
  }

  const standingRefunds = await readStandingRefunds(charge.id)
  if (standingRefunds.latestId === undefined) {
    console.info(`Charge ${charge.id} has no refund that still stands; nothing to record.`)

    return
  }

  const unannouncedRefund = await refundOrder({
    fullyRefunded: standingRefunds.total >= charge.amount,
    refundedAmount: standingRefunds.total,
    transactionId: session.id,
  })
  scheduleAdminOrdersInvalidation()
  console.info(`Recorded refund of ${standingRefunds.total} for charge ${charge.id}.`)
  if ((await lowerRefundsFailedMeanwhile(charge.id, session.id, standingRefunds.total)) || unannouncedRefund === undefined) {
    return
  }

  const refundEmailDelivery = sendOrderRefundedEmail({ ...unannouncedRefund, refundId: standingRefunds.latestId }, session.return_url)
  scheduleBackgroundWork(refundEmailDelivery)
  await refundEmailDelivery
}

const describeUndoneRefund = (
  refund: StripeType.Refund & { readonly status: string },
  session: StripeType.Checkout.Session,
  orderNumber: string,
): string =>
  [
    orderNumber,
    formatPaidAmount(refund.amount, resolveCheckoutSessionCurrency(session), resolveCheckoutSessionLocale(session)),
    refund.status,
    refund.failure_reason,
  ]
    .filter((fact): fact is string => fact !== undefined)
    .join(" — ")

const handleRefundUndone = async (refund: StripeType.Refund): Promise<void> => {
  if (!isUndoneRefund(refund)) {
    return
  }

  const chargeId = resolveStripeObjectId(refund.charge)
  const session = await resolveCheckoutSession(refund.payment_intent)
  if (chargeId === undefined || session === undefined) {
    console.info(`Refund ${refund.id} ${refund.status} but no Checkout Session resolved; skipping.`)

    return
  }

  const { total } = await readStandingRefunds(chargeId)
  const failedRefund = await undoFailedRefund({
    refund: { amount: refund.amount, failureReason: refund.failure_reason, id: refund.id, status: refund.status },
    refundedAmount: total,
    transactionId: session.id,
  })
  if (failedRefund === undefined) {
    console.info(`Refund ${refund.id} ${refund.status} but Checkout Session ${session.id} has no order; skipping.`)

    return
  }

  scheduleAdminOrdersInvalidation()
  const detail = describeUndoneRefund(refund, session, failedRefund.orderNumber)
  console.warn(`Refund ${refund.id} did not reach the customer; the shop was alerted: ${detail}`)
  scheduleBackgroundWork(sendIncidentAlert({ detail, kind: "refundFailed", reference: refund.id }))
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
  [STRIPE_WEBHOOK_EVENTS.REFUND_FAILED]: async (event) => {
    await handleRefundUndone(z.custom<StripeType.Refund>().parse(event.data.object))
  },
  [STRIPE_WEBHOOK_EVENTS.REFUND_UPDATED]: async (event) => {
    await handleRefundUndone(z.custom<StripeType.Refund>().parse(event.data.object))
  },
}
