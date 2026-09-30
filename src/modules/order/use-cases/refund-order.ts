import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { recordOrderRefundAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { buildOrderRefundAuditChange } from "~/src/modules/order/order-audit.utils"
import { getOrderByCheckoutId, getRestockLinesForOrder } from "~/src/modules/order/order.accessors"
import { findSettledOrder } from "~/src/modules/order/order.settled.server"
import { type Order } from "~/src/modules/order/order.types"
import { prepareRefundBatch } from "~/src/modules/order/order.utils"
import { getPaymentByTransactionId } from "~/src/modules/payment/payment.accessors"

const resolveRefundAfterSnapshot = (
  before: Order["auditSnapshot"],
  input: Order["refundInput"],
  orderId: string | undefined,
): Order["auditSnapshot"] => ({
  orderStatus: input.fullyRefunded && orderId !== undefined ? "refunded" : before.orderStatus,
  paymentStatus: input.fullyRefunded ? "refunded" : before.paymentStatus,
  refundedAmount: input.refundedAmount,
})

export const refundOrder = async (input: Order["refundInput"]): Promise<void> => {
  const settled = await findSettledOrder(input.transactionId)
  if (settled === undefined || settled.paymentStatus === "refunded") {
    return
  }

  const paymentRow = await getPaymentByTransactionId(input.transactionId)
  const orderRow = paymentRow === undefined || settled.orderId === undefined ? undefined : await getOrderByCheckoutId(paymentRow.checkoutId)
  const before: Order["auditSnapshot"] = {
    orderStatus: orderRow?.status,
    paymentStatus: settled.paymentStatus,
    refundedAmount: paymentRow?.refundedAmount,
  }

  const restockLines: {
    quantity: number
    variantId: string
  }[] = []

  if (input.restock && input.fullyRefunded && settled.orderId !== undefined) {
    const lines = await getRestockLinesForOrder(settled.orderId)
    restockLines.push(
      ...lines.filter(
        (
          line,
        ): line is {
          quantity: number
          variantId: string
        } => line.variantId !== null,
      ),
    )
  }
  await runDrizzleBatch(prepareRefundBatch(settled, input, restockLines))
  if (settled.orderId === undefined) {
    return
  }

  const after = resolveRefundAfterSnapshot(before, input, settled.orderId)
  const auditChange = buildOrderRefundAuditChange(before, after)
  recordOrderRefundAudit(settled.orderId, {
    detail: auditChange.detail,
    metadata: auditChange.metadata,
    resourceId: settled.orderId,
  })
}
