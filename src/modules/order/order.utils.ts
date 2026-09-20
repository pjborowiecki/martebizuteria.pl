import { eq, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { inventory } from "~/src/modules/inventory/inventory.schema"
import { order } from "~/src/modules/order/order.schema"
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
): SettledOrder | undefined => {
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
export const prepareRefundBatch = (
  settled: SettledOrder,
  { fullyRefunded, refundedAmount }: RefundOrderInput,
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

export interface SettledOrder {
  checkoutId: string
  orderId: string | undefined
  paymentId: string
  paymentStatus: string
}
export interface RefundOrderInput {
  fullyRefunded: boolean
  refundedAmount: number
  restock: boolean
  transactionId: string
}
