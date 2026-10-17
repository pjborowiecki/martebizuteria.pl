import { and, eq, gt, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderRefundFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"
import { payment } from "~/src/modules/payment/payment.schema"

const AUDIT_DETAIL_SEPARATOR = " — "

const findRefundedOrder = async (transactionId: string): Promise<RefundedOrder | undefined> => {
  const [row] = await db
    .select({
      fulfillmentStatus: order.fulfillmentStatus,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: payment.id,
      refundedAmount: payment.refundedAmount,
    })
    .from(payment)
    .innerJoin(order, eq(order.paymentId, payment.id))
    .where(eq(payment.transactionId, transactionId))
    .limit(1)

  return row
}

const prepareUndoRefundBatch = (recorded: RefundedOrder, refundedAmount: number) =>
  [
    db
      .update(payment)
      .set(refundedAmount > 0 ? { refundedAmount, status: "succeeded" } : { refundedAmount, refundedAt: sql`NULL`, status: "succeeded" })
      .where(and(eq(payment.id, recorded.paymentId), gt(payment.refundedAmount, refundedAmount))),
    db
      .update(order)
      .set({ status: recorded.fulfillmentStatus === "delivered" ? "completed" : "processing" })
      .where(and(eq(order.id, recorded.orderId), eq(order.status, "refunded"))),
  ] as const

const describeFailedRefund = ({ amount, failureReason, status }: Order["failedRefundInput"]["refund"]): string =>
  [String(amount), status, ...(failureReason === undefined ? [] : [failureReason])].join(AUDIT_DETAIL_SEPARATOR)

export const lowerRefundedAmount = async ({
  refundedAmount,
  transactionId,
}: Omit<Order["failedRefundInput"], "refund">): Promise<RefundedOrder | undefined> => {
  const recorded = await findRefundedOrder(transactionId)
  if (recorded !== undefined && recorded.refundedAmount > refundedAmount) {
    await db.batch(prepareUndoRefundBatch(recorded, refundedAmount))
  }

  return recorded
}

export const undoFailedRefund = async ({
  refund,
  refundedAmount,
  transactionId,
}: Order["failedRefundInput"]): Promise<Order["failedRefund"] | undefined> => {
  const recorded = await lowerRefundedAmount({ refundedAmount, transactionId })
  if (recorded === undefined) {
    return undefined
  }

  recordOrderRefundFailedAudit(recorded.orderId, refund.id, { detail: describeFailedRefund(refund), resourceId: recorded.orderId })

  return { orderId: recorded.orderId, orderNumber: recorded.orderNumber }
}

interface RefundedOrder {
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly orderId: string
  readonly orderNumber: string
  readonly paymentId: string
  readonly refundedAmount: number
}
