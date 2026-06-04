import { eq } from "drizzle-orm";

import { runDrizzleBatch, type DrizzleBatchStatement } from "~/src/integrations/drizzle-orm/drizzle.batch";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { order } from "~/src/modules/order/order.schema";
import { payment } from "~/src/modules/payment/payment.schema";

async function runBatch(statements: readonly DrizzleBatchStatement[]): Promise<void> {
  await runDrizzleBatch(statements);
}

function getPaymentByTransactionId(transactionId: string) {
  return db.query.payment.findFirst({
    columns: { checkoutId: true, id: true, status: true },
    where: eq(payment.transactionId, transactionId)
  });
}

function getOrderByCheckoutId(checkoutId: string) {
  return db.query.order.findFirst({
    columns: { id: true },
    where: eq(order.checkoutId, checkoutId)
  });
}

function getOrderMetadata(orderId: string) {
  return db.query.order.findFirst({ columns: { metadata: true }, where: eq(order.id, orderId) });
}

function getRestockLinesForOrder(orderId: string) {
  return db.select({ quantity: orderItem.quantity, variantId: orderItem.variantId }).from(orderItem).where(eq(orderItem.orderId, orderId));
}

async function updateOrderMetadata(orderId: string, metadata: string): Promise<void> {
  await db.update(order).set({ metadata }).where(eq(order.id, orderId));
}

export const orderAccessors = {
  getOrderByCheckoutId,
  getOrderMetadata,
  getPaymentByTransactionId,
  getRestockLinesForOrder,
  runBatch,
  updateOrderMetadata
};
