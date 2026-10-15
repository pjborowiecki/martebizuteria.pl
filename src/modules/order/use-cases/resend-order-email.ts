import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import type StripeType from "stripe"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordEmailResendRequestedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getAdminOrderRefundTarget, getAdminOrderTimelineRows } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND, ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { resolveResendableOrderEmails } from "~/src/modules/order/order.detail.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { sendNewOrderEmail } from "~/src/modules/order/use-cases/send-new-order-email.server"
import { sendOrderCancelledEmail } from "~/src/modules/order/use-cases/send-order-cancelled-email.server"
import { sendOrderConfirmationEmail } from "~/src/modules/order/use-cases/send-order-confirmation-email.server"
import { sendOrderDeliveredEmail } from "~/src/modules/order/use-cases/send-order-delivered-email.server"
import { sendOrderInProgressEmail } from "~/src/modules/order/use-cases/send-order-in-progress-email.server"
import { sendOrderRefundedEmail } from "~/src/modules/order/use-cases/send-order-refunded-email.server"
import { sendOrderShippedEmail } from "~/src/modules/order/use-cases/send-order-shipped-email.server"
import { sendOrderTrackingEmail } from "~/src/modules/order/use-cases/send-order-tracking-email.server"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { resolveRequestOrigin } from "~/src/lib/request"

const retrieveOrderCheckoutSession = async (orderId: string): Promise<StripeType.Checkout.Session> => {
  const target = await getAdminOrderRefundTarget(orderId)
  const transactionId = target?.transactionId
  if (transactionId === undefined || transactionId === null || transactionId === "") {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  return stripe.checkout.sessions.retrieve(transactionId)
}

const sendOrderEmailAgain = async (email: Order["email"], orderId: string, origin: string): Promise<boolean> => {
  if (email.kind === ORDER_EMAIL_KIND.IN_PROGRESS) {
    return sendOrderInProgressEmail(orderId, origin)
  }

  if (email.kind === ORDER_EMAIL_KIND.SHIPPED) {
    return sendOrderShippedEmail(orderId, origin)
  }

  if (email.kind === ORDER_EMAIL_KIND.DELIVERED) {
    return sendOrderDeliveredEmail(orderId, origin)
  }

  if (email.kind === ORDER_EMAIL_KIND.TRACKING) {
    return sendOrderTrackingEmail({ orderId, origin, trackingNumber: email.trackingNumber })
  }

  if (email.kind === ORDER_EMAIL_KIND.CANCELLED) {
    return sendOrderCancelledEmail({ orderId, refundedAmount: email.refundedAmount }, origin)
  }

  const session = await retrieveOrderCheckoutSession(orderId)
  if (email.kind === ORDER_EMAIL_KIND.NEW_ORDER) {
    return sendNewOrderEmail(orderId, session.return_url)
  }

  if (email.kind === ORDER_EMAIL_KIND.REFUNDED) {
    const { amount, fullyRefunded, refundId, refundedTotal } = email

    return sendOrderRefundedEmail({ amount, fullyRefunded, orderId, refundId, refundedTotal }, session.return_url)
  }

  return sendOrderConfirmationEmail(session, orderId)
}

export const resendOrderEmail = createServerFn({ method: "POST" })
  .middleware([authorized({ order: ["update"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminResendOrderEmailInput>) =>
    orderZodSchemas.adminResendOrderEmailInput.parse(input),
  )
  .handler(async ({ data: { eventId, orderId } }) => {
    const origin = resolveRequestOrigin(getRequest())
    const resendable = resolveResendableOrderEmails(await getAdminOrderTimelineRows(orderId)).get(eventId)
    if (resendable === undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
    }

    recordEmailResendRequestedAudit(orderId, { detail: resendable.detail, metadata: { idempotencyKey: resendable.idempotencyKey } })
    const emailDelivery = sendOrderEmailAgain(resendable.email, orderId, origin)
    scheduleBackgroundWork(emailDelivery)
    const emailSent = await emailDelivery

    return { emailSent, ok: true, orderId }
  })

export const resendOrderEmailMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof resendOrderEmail>[0]["data"]) => resendOrderEmail({ data }),
  mutationKey: ORDER_MUTATION_KEYS.RESEND_EMAIL,
})
