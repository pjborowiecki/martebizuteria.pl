import { orderAccessors } from "~/src/modules/order/order.accessors";
import {
  clearDisputeMetadata,
  mergeDisputeMetadata,
  prepareRefundBatch,
  resolveSettledOrder,
  type DisputeMetadata,
  type RefundOrderInput
} from "~/src/modules/order/order.utils";

async function findSettledOrder(transactionId: string) {
  const paymentRow = await orderAccessors.getPaymentByTransactionId(transactionId);
  const orderRow = paymentRow === undefined ? undefined : await orderAccessors.getOrderByCheckoutId(paymentRow.checkoutId);

  return resolveSettledOrder(paymentRow, orderRow, transactionId);
}

async function refundOrder(input: RefundOrderInput): Promise<void> {
  const settled = await findSettledOrder(input.transactionId);
  if (settled === undefined || settled.paymentStatus === "refunded") {
    return;
  }

  const restockLines: { quantity: number; variantId: string }[] = [];
  if (input.restock && input.fullyRefunded && settled.orderId !== undefined) {
    const lines = await orderAccessors.getRestockLinesForOrder(settled.orderId);
    restockLines.push(...lines.filter((line): line is { quantity: number; variantId: string } => line.variantId !== null));
  }

  await orderAccessors.runBatch(prepareRefundBatch(settled, input, restockLines));
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
