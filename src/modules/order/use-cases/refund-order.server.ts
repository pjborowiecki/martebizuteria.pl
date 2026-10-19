import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordOrderRefundAudit } from "~/src/modules/audit-log/use-cases/record-order-audit.server"
import { getOrderByCheckoutId, prepareRefundBatch } from "~/src/modules/order/order.accessors"
import { type Order } from "~/src/modules/order/order.types"
import { buildOrderRefundAuditChange } from "~/src/modules/order/order.utils"
import { findSettledOrder } from "~/src/modules/order/use-cases/find-settled-order.server"
import { getPaymentByTransactionId } from "~/src/modules/payment/payment.accessors"

const resolveRefundAfterSnapshot = (
  before: Order["auditSnapshot"],
  input: Order["refundInput"],
  orderId: string | undefined,
): Order["auditSnapshot"] => ({
  orderStatus: input.fullyRefunded && orderId !== undefined && before.orderStatus !== "cancelled" ? "refunded" : before.orderStatus,
  paymentStatus: input.fullyRefunded ? "refunded" : before.paymentStatus,
  refundedAmount: before.refundedAmount === undefined ? input.refundedAmount : Math.max(before.refundedAmount, input.refundedAmount),
})

const resolveUnannouncedRefund = (
  recorded: RecordedRefund | undefined,
  { fullyRefunded, refundedAmount }: Order["refundInput"],
  orderId: string,
): Order["unannouncedRefund"] | undefined => {
  if (recorded === undefined || recorded.orderStatus === "cancelled" || refundedAmount <= recorded.refundedAmount) {
    return undefined
  }

  return { amount: refundedAmount - recorded.refundedAmount, fullyRefunded, orderId, refundedTotal: refundedAmount }
}

export const refundOrder = async (input: Order["refundInput"]): Promise<Order["unannouncedRefund"] | undefined> => {
  const settled = await findSettledOrder(input.transactionId)
  if (settled === undefined || settled.paymentStatus === "refunded") {
    return undefined
  }

  const paymentRow = await getPaymentByTransactionId(input.transactionId)
  const orderRow = paymentRow === undefined || settled.orderId === undefined ? undefined : await getOrderByCheckoutId(paymentRow.checkoutId)
  const before: Order["auditSnapshot"] = {
    orderStatus: orderRow?.status,
    paymentStatus: settled.paymentStatus,
    refundedAmount: paymentRow?.refundedAmount,
  }

  const [[recorded]] = await db.batch(prepareRefundBatch(settled, input))
  if (settled.orderId === undefined || recorded?.paymentStatus === "refunded") {
    return undefined
  }

  const after = resolveRefundAfterSnapshot(before, input, settled.orderId)
  const auditChange = buildOrderRefundAuditChange(before, after)
  recordOrderRefundAudit(settled.orderId, {
    metadata: auditChange.metadata,
    resourceId: settled.orderId,
  })

  return resolveUnannouncedRefund(recorded, input, settled.orderId)
}

interface RecordedRefund {
  readonly orderStatus: Order["select"]["status"] | null
  readonly refundedAmount: number
}
