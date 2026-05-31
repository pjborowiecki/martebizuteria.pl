import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { inventory } from "~/src/modules/inventory/inventory.schema";
import { orderItem } from "~/src/modules/order-item/order-item.schema";
import { order } from "~/src/modules/order/order.schema";
import { payment } from "~/src/modules/payment/payment.schema";

/** The order + payment behind a settled Stripe transaction (Checkout Session id). */
interface SettledOrder {
  checkoutId: string;
  orderId: string | undefined;
  paymentId: string;
  paymentStatus: string;
}

interface RefundOrderInput {
  /** True when Stripe reports the charge fully (not partially) refunded. */
  fullyRefunded: boolean;
  /** Total refunded so far, in minor units. */
  refundedAmount: number;
  /** Return the purchased quantities to available stock. */
  restock: boolean;
  /** Stripe Checkout Session id (our `payment.transactionId`). */
  transactionId: string;
}

interface DisputeMetadata {
  amount: number;
  id: string;
  reason: string;
  status: string;
}

/**
 * Resolves our payment + order rows from a Stripe transaction id (the Checkout
 * Session id we persist on `payment.transactionId`). Returns `undefined` when no
 * payment matches, which keeps every webhook handler idempotent against retries
 * and events for sessions we never recorded.
 */
async function findSettledOrder(transactionId: string): Promise<SettledOrder | undefined> {
  const paymentRow = await db.query.payment.findFirst({
    columns: { checkoutId: true, id: true, status: true },
    where: eq(payment.transactionId, transactionId)
  });

  if (paymentRow === undefined) {
    console.info(`No payment for transaction ${transactionId}; nothing to update.`);
    return undefined;
  }

  const orderRow = await db.query.order.findFirst({
    columns: { id: true },
    where: eq(order.checkoutId, paymentRow.checkoutId)
  });

  return {
    checkoutId: paymentRow.checkoutId,
    orderId: orderRow?.id,
    paymentId: paymentRow.id,
    paymentStatus: paymentRow.status
  };
}

const metadataSchema = z.record(z.string(), z.unknown());

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (raw === null || raw === undefined || raw === "") {
    return {};
  }
  try {
    return metadataSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function restockLinesFor(orderId: string): Promise<{ quantity: number; variantId: string }[]> {
  const items = await db.query.orderItem.findMany({
    columns: { quantity: true, variantId: true },
    where: eq(orderItem.orderId, orderId)
  });

  return items.flatMap((item) => (item.variantId === null ? [] : [{ quantity: item.quantity, variantId: item.variantId }]));
}

/**
 * Records a Stripe refund against the matching order: marks the payment refunded
 * (and the order, when fully refunded) and — for genuine refunds — returns the
 * sold quantities to available stock. Idempotent: a payment already marked
 * `refunded` is left untouched, so duplicate `charge.refunded` deliveries are
 * safe.
 */
async function refundOrder({ fullyRefunded, refundedAmount, restock, transactionId }: RefundOrderInput): Promise<void> {
  const settled = await findSettledOrder(transactionId);
  if (settled === undefined || settled.paymentStatus === "refunded") {
    return;
  }

  const restockLines = restock && fullyRefunded && settled.orderId !== undefined ? await restockLinesFor(settled.orderId) : [];

  await db.batch([
    db
      .update(payment)
      .set({ refundedAmount, refundedAt: new Date(), status: fullyRefunded ? "refunded" : "succeeded" })
      .where(eq(payment.id, settled.paymentId)),
    ...(fullyRefunded && settled.orderId !== undefined
      ? [db.update(order).set({ status: "refunded" }).where(eq(order.id, settled.orderId))]
      : []),
    ...restockLines.map((line) =>
      db
        .update(inventory)
        .set({ quantityAvailable: sql`${inventory.quantityAvailable} + ${line.quantity}` })
        .where(eq(inventory.variantId, line.variantId))
    )
  ]);
}

/**
 * Records an open dispute on the order's `metadata` so fulfillment can be frozen
 * pending resolution. Inventory and status are intentionally left as-is — a
 * chargeback does not mean the goods came back.
 */
async function flagOrderDispute(transactionId: string, dispute: DisputeMetadata): Promise<void> {
  const settled = await findSettledOrder(transactionId);
  if (settled?.orderId === undefined) {
    return;
  }

  const current = await db.query.order.findFirst({ columns: { metadata: true }, where: eq(order.id, settled.orderId) });
  const metadata = { ...parseMetadata(current?.metadata), dispute };

  await db
    .update(order)
    .set({ metadata: JSON.stringify(metadata) })
    .where(eq(order.id, settled.orderId));
}

/** Clears the dispute flag from an order's metadata once the dispute is resolved in our favour. */
async function clearOrderDispute(transactionId: string): Promise<void> {
  const settled = await findSettledOrder(transactionId);
  if (settled?.orderId === undefined) {
    return;
  }

  const current = await db.query.order.findFirst({ columns: { metadata: true }, where: eq(order.id, settled.orderId) });
  const { dispute: _removed, ...rest } = parseMetadata(current?.metadata);

  await db
    .update(order)
    .set({ metadata: JSON.stringify(rest) })
    .where(eq(order.id, settled.orderId));
}

export const orderAccessors = {
  clearOrderDispute,
  flagOrderDispute,
  refundOrder
};

export type { DisputeMetadata };
