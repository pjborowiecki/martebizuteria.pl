import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { inventory } from "~/src/modules/inventory/inventory.schema";
import { order } from "~/src/modules/order/order.schema";
import { payment } from "~/src/modules/payment/payment.schema";

export interface DisputeMetadata {
  amount: number;
  id: string;
  reason: string;
  status: string;
}

export interface SettledOrder {
  checkoutId: string;
  orderId: string | undefined;
  paymentId: string;
  paymentStatus: string;
}

export interface RefundOrderInput {
  fullyRefunded: boolean;
  refundedAmount: number;
  restock: boolean;
  transactionId: string;
}

const metadataSchema = z.record(z.string(), z.unknown());

export function parseOrderMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (raw === null || raw === undefined || raw === "") {
    return {};
  }
  try {
    return metadataSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function resolveSettledOrder(
  paymentRow: { checkoutId: string; id: string; status: string } | undefined,
  orderRow: { id: string } | undefined,
  transactionId: string
): SettledOrder | undefined {
  if (paymentRow === undefined) {
    console.info(`No payment for transaction ${transactionId}; nothing to update.`);
    return undefined;
  }

  return {
    checkoutId: paymentRow.checkoutId,
    orderId: orderRow?.id,
    paymentId: paymentRow.id,
    paymentStatus: paymentRow.status
  };
}

export function prepareRefundBatch(
  settled: SettledOrder,
  { fullyRefunded, refundedAmount }: RefundOrderInput,
  restockLines: { quantity: number; variantId: string }[]
): BatchItem<"sqlite">[] {
  return [
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
  ];
}

export function mergeDisputeMetadata(currentMetadata: string | null | undefined, dispute: DisputeMetadata): string {
  const metadata = { ...parseOrderMetadata(currentMetadata), dispute };
  return JSON.stringify(metadata);
}

export function clearDisputeMetadata(currentMetadata: string | null | undefined): string {
  const { dispute: _removed, ...rest } = parseOrderMetadata(currentMetadata);
  return JSON.stringify(rest);
}
