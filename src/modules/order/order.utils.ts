import { eq, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { inventory } from "~/src/modules/inventory/inventory.schema"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"
import { payment } from "~/src/modules/payment/payment.schema"

export const resolveSettledOrder = (
  paymentRow:
    | {
        checkoutId: string
        id: string
        status: string
      }
    | undefined,
  orderRow:
    | {
        id: string
      }
    | undefined,
  transactionId: string,
): Order["settled"] | undefined => {
  if (paymentRow === undefined) {
    console.info(`No payment for transaction ${transactionId}; nothing to update.`)

    return undefined
  }

  return {
    checkoutId: paymentRow.checkoutId,
    orderId: orderRow?.id,
    paymentId: paymentRow.id,
    paymentStatus: paymentRow.status,
  }
}

export const prepareCancelOrderBatch = (
  orderId: string,
  restockLines: readonly {
    quantity: number
    variantId: string
  }[],
): BatchItem<"sqlite">[] => [
  db
    .update(order)
    .set({
      canceledAt: new Date(),
      fulfillmentStatus: "cancelled",
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(order.id, orderId)),
  ...restockLines.map((line) =>
    db
      .update(inventory)
      .set({
        quantityAvailable: sql`${inventory.quantityAvailable} + ${line.quantity}`,
      })
      .where(eq(inventory.variantId, line.variantId)),
  ),
]

export const prepareRefundBatch = (
  settled: Order["settled"],
  { fullyRefunded, refundedAmount }: Order["refundInput"],
  restockLines: {
    quantity: number
    variantId: string
  }[],
): BatchItem<"sqlite">[] => [
  db
    .update(payment)
    .set({
      refundedAmount,
      refundedAt: new Date(),
      status: fullyRefunded ? "refunded" : "succeeded",
    })
    .where(eq(payment.id, settled.paymentId)),
  ...(fullyRefunded && settled.orderId !== undefined
    ? [
        db
          .update(order)
          .set({
            status: "refunded",
          })
          .where(eq(order.id, settled.orderId)),
      ]
    : []),
  ...restockLines.map((line) =>
    db
      .update(inventory)
      .set({
        quantityAvailable: sql`${inventory.quantityAvailable} + ${line.quantity}`,
      })
      .where(eq(inventory.variantId, line.variantId)),
  ),
]
