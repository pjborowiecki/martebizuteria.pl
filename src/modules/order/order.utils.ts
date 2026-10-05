import { type SQL, and, eq, exists, inArray, notInArray, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { inventory } from "~/src/modules/inventory/inventory.schema"
import { CANCELLED_ORDER_STATUSES, DISPATCHED_FULFILLMENT_STATUSES, OPEN_ORDER_STATUSES } from "~/src/modules/order/order.constants"
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

const existsOrderWhere = (condition: SQL | undefined): SQL => exists(db.select({ id: order.id }).from(order).where(condition))

const prepareRestockWhile = (orderHoldsStock: SQL, line: RestockLine): BatchItem<"sqlite"> =>
  db
    .update(inventory)
    .set({
      quantityAvailable: sql`${inventory.quantityAvailable} + ${line.quantity}`,
    })
    .where(and(eq(inventory.variantId, line.variantId), orderHoldsStock))

export const prepareCancelOrderBatch = (
  orderId: string,
  restockLines: readonly RestockLine[],
): [...BatchItem<"sqlite">[], BatchItem<"sqlite">] => {
  const cancellableOrder = and(
    eq(order.id, orderId),
    inArray(order.status, [...OPEN_ORDER_STATUSES]),
    notInArray(order.fulfillmentStatus, [...DISPATCHED_FULFILLMENT_STATUSES]),
  )

  return [
    ...restockLines.map((line) => prepareRestockWhile(existsOrderWhere(cancellableOrder), line)),
    db
      .update(order)
      .set({
        canceledAt: new Date(),
        fulfillmentStatus: "cancelled",
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(cancellableOrder)
      .returning({ id: order.id }),
  ]
}

const prepareFullOrderRefund = (orderId: string, restockLines: readonly RestockLine[]): BatchItem<"sqlite">[] => {
  const orderHoldingStock = and(eq(order.id, orderId), notInArray(order.status, [...CANCELLED_ORDER_STATUSES]))

  return [
    ...restockLines.map((line) => prepareRestockWhile(existsOrderWhere(orderHoldingStock), line)),
    db
      .update(order)
      .set({
        status: "refunded",
      })
      .where(orderHoldingStock),
  ]
}

export const prepareRefundBatch = (
  settled: Order["settled"],
  { fullyRefunded, refundedAmount }: Order["refundInput"],
  restockLines: readonly RestockLine[],
) =>
  [
    db
      .select({ orderStatus: order.status, refundedAmount: payment.refundedAmount })
      .from(payment)
      .leftJoin(order, eq(order.paymentId, payment.id))
      .where(eq(payment.id, settled.paymentId)),
    db
      .update(payment)
      .set({
        refundedAmount: sql`max(${payment.refundedAmount}, ${refundedAmount})`,
        refundedAt: new Date(),
        status: fullyRefunded ? "refunded" : "succeeded",
      })
      .where(eq(payment.id, settled.paymentId)),
    ...(fullyRefunded && settled.orderId !== undefined ? prepareFullOrderRefund(settled.orderId, restockLines) : []),
  ] as const

interface RestockLine {
  readonly quantity: number
  readonly variantId: string
}
