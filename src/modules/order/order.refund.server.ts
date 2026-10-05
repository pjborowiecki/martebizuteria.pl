import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type AdminOrderRefundTarget } from "~/src/modules/order/order.accessors"
import { resolveAdminOrderRefundBlocker } from "~/src/modules/order/order.admin-actions.utils"
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { resolveAdminOrderDispute } from "~/src/modules/order/order.detail.utils"

export const requestFullOrderRefund = async (orderId: string, target: AdminOrderRefundTarget): Promise<number> => {
  const { transactionId } = target
  const blocker = resolveAdminOrderRefundBlocker({
    hasOpenDispute: resolveAdminOrderDispute(target.metadata) !== undefined,
    totalMinorUnits: target.total,
  })

  if (blocker !== undefined || transactionId === null || transactionId === "") {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  const session = await stripe.checkout.sessions.retrieve(transactionId)
  const paymentIntentId = resolveStripeObjectId(session.payment_intent)
  if (session.payment_status === "no_payment_required" || paymentIntentId === undefined) {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  const refund = await stripe.refunds.create(
    {
      metadata: {
        orderId,
      },
      payment_intent: paymentIntentId,
    },
    { idempotencyKey: `admin-order-refund-${orderId}` },
  )

  return refund.amount
}
