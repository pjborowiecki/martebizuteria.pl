import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import type StripeType from "stripe"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { notifyShopOfNewOrder } from "~/src/integrations/resend/new-order.notification.server"
import { notifyOrderCancelled } from "~/src/integrations/resend/order-cancelled.notification.server"
import { notifyOrderRefunded } from "~/src/integrations/resend/order-refunded.notification.server"
import { notifyOrderShipped } from "~/src/integrations/resend/order-shipped.notification.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { notifyOrderConfirmed } from "~/src/integrations/stripe/stripe.webhooks"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordEmailResendRequestedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getAdminOrderRefundTarget, getAdminOrderTimelineRows } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND, ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { resolveResendableOrderEmails } from "~/src/modules/order/order.detail.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

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
  if (email.kind === ORDER_EMAIL_KIND.SHIPPED) {
    return notifyOrderShipped(orderId, origin)
  }

  if (email.kind === ORDER_EMAIL_KIND.CANCELLED) {
    return notifyOrderCancelled({ orderId, refundedAmount: email.refundedAmount }, origin)
  }

  const session = await retrieveOrderCheckoutSession(orderId)
  if (email.kind === ORDER_EMAIL_KIND.NEW_ORDER) {
    return notifyShopOfNewOrder(orderId, session.return_url)
  }

  if (email.kind === ORDER_EMAIL_KIND.REFUNDED) {
    const { amount, fullyRefunded, refundedTotal } = email

    return notifyOrderRefunded({ amount, fullyRefunded, orderId, refundedTotal }, session.return_url)
  }

  return notifyOrderConfirmed(session, orderId)
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

    recordEmailResendRequestedAudit(orderId, { detail: resendable.detail })
    const emailDelivery = sendOrderEmailAgain(resendable.email, orderId, origin)
    scheduleBackgroundWork(emailDelivery)
    const emailSent = await emailDelivery

    return { emailSent, ok: true, orderId }
  })

export const resendOrderEmailMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof resendOrderEmail>[0]["data"]) => resendOrderEmail({ data }),
  mutationKey: ORDER_MUTATION_KEYS.RESEND_EMAIL,
})
