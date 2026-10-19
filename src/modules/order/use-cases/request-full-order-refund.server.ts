import { isUndoneRefund, listRefunds } from "~/src/integrations/stripe/stripe.refunds.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordOrderRefundRequestedAudit } from "~/src/modules/audit-log/use-cases/record-order-audit.server"
import { type AdminOrderRefundTarget } from "~/src/modules/order/order.accessors"
import { ADMIN_ORDER_REFUND_BLOCKER, ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { resolveAdminOrderDispute, resolveAdminOrderRefundBlocker } from "~/src/modules/order/order.utils"

export const requestFullOrderRefund = async (orderId: string, target: AdminOrderRefundTarget): Promise<number> => {
  const { transactionId } = target
  const blocker = resolveAdminOrderRefundBlocker({
    hasOpenDispute: resolveAdminOrderDispute(target.metadata) !== undefined,
    totalMinorUnits: target.total,
  })

  if (blocker === ADMIN_ORDER_REFUND_BLOCKER.OPEN_DISPUTE) {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.OPEN_DISPUTE)
  }

  if (blocker !== undefined || transactionId === null || transactionId === "") {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  const session = await stripe.checkout.sessions.retrieve(transactionId)
  const paymentIntentId = resolveStripeObjectId(session.payment_intent)
  if (session.payment_status === "no_payment_required" || paymentIntentId === undefined) {
    throw new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)
  }

  const earlierRefunds = await listRefunds({ payment_intent: paymentIntentId })
  const undoneRefunds = earlierRefunds.filter((earlierRefund) => isUndoneRefund(earlierRefund))
  const refund = await stripe.refunds.create(
    {
      metadata: {
        orderId,
      },
      payment_intent: paymentIntentId,
    },
    { idempotencyKey: `admin-order-refund-${orderId}-${undoneRefunds.length}` },
  )
  recordOrderRefundRequestedAudit(orderId)

  return refund.amount
}
