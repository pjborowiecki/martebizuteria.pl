import { recordOrderRefundAudit } from "~/src/modules/audit-log/audit-log.events.server";
import { buildOrderRefundAuditChange, type OrderAuditSnapshot } from "~/src/modules/order/order-audit.utils";
import { orderAccessors } from "~/src/modules/order/order.accessors";
import { clearDisputeMetadata, mergeDisputeMetadata, type DisputeMetadata } from "~/src/modules/order/order.display.utils";
import { prepareRefundBatch, resolveSettledOrder, type RefundOrderInput } from "~/src/modules/order/order.utils";

async function findSettledOrder(transactionId: string) {
  const paymentRow = await orderAccessors.getPaymentByTransactionId(transactionId);
  const orderRow = paymentRow === undefined ? undefined : await orderAccessors.getOrderByCheckoutId(paymentRow.checkoutId);

  return resolveSettledOrder(paymentRow, orderRow, transactionId);
}

function resolveRefundAfterSnapshot(before: OrderAuditSnapshot, input: RefundOrderInput, orderId: string | undefined): OrderAuditSnapshot {
  return {
    orderStatus: input.fullyRefunded && orderId !== undefined ? "refunded" : before.orderStatus,
    paymentStatus: input.fullyRefunded ? "refunded" : before.paymentStatus,
    refundedAmount: input.refundedAmount
  };
}

async function refundOrder(input: RefundOrderInput): Promise<void> {
  const settled = await findSettledOrder(input.transactionId);
  if (settled === undefined || settled.paymentStatus === "refunded") {
    return;
  }

  const paymentRow = await orderAccessors.getPaymentByTransactionId(input.transactionId);
  const orderRow =
    paymentRow === undefined || settled.orderId === undefined
      ? undefined
      : await orderAccessors.getOrderByCheckoutId(paymentRow.checkoutId);

  const before: OrderAuditSnapshot = {
    orderStatus: orderRow?.status,
    paymentStatus: settled.paymentStatus,
    refundedAmount: paymentRow?.refundedAmount
  };

  const restockLines: { quantity: number; variantId: string }[] = [];
  if (input.restock && input.fullyRefunded && settled.orderId !== undefined) {
    const lines = await orderAccessors.getRestockLinesForOrder(settled.orderId);
    restockLines.push(...lines.filter((line): line is { quantity: number; variantId: string } => line.variantId !== null));
  }

  await orderAccessors.runBatch(prepareRefundBatch(settled, input, restockLines));

  if (settled.orderId === undefined) {
    return;
  }

  const after = resolveRefundAfterSnapshot(before, input, settled.orderId);
  const auditChange = buildOrderRefundAuditChange(before, after);

  recordOrderRefundAudit(settled.orderId, {
    detail: auditChange.detail,
    metadata: auditChange.metadata,
    resourceId: settled.orderId
  });
}

async function flagOrderDispute(transactionId: string, dispute: DisputeMetadata): Promise<void> {
  const settled = await findSettledOrder(transactionId);
  if (settled?.orderId === undefined) {
    return;
  }

  const current = await orderAccessors.getOrderMetadata(settled.orderId);
  await orderAccessors.updateOrderMetadata(settled.orderId, mergeDisputeMetadata(current?.metadata, dispute));
}

async function clearOrderDispute(transactionId: string): Promise<void> {
  const settled = await findSettledOrder(transactionId);
  if (settled?.orderId === undefined) {
    return;
  }

  const current = await orderAccessors.getOrderMetadata(settled.orderId);
  await orderAccessors.updateOrderMetadata(settled.orderId, clearDisputeMetadata(current?.metadata));
}

export const orderMutations = {
  clearOrderDispute,
  flagOrderDispute,
  refundOrder
};

export type { DisputeMetadata };
