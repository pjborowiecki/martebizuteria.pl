import { and, eq, inArray, notInArray } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { DISPATCHED_FULFILLMENT_STATUSES, OPEN_ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { type RestockLine } from "~/src/modules/order/order.types"
import { prepareRestockOrderBatch } from "~/src/modules/order/use-cases/return-order-to-stock.server"

export const prepareCancelOrderBatch = (
  orderId: string,
  restockLines: readonly RestockLine[],
): [...BatchItem<"sqlite">[], BatchItem<"sqlite">] => {
  const unshipped = notInArray(order.fulfillmentStatus, [...DISPATCHED_FULFILLMENT_STATUSES])

  return [
    ...prepareRestockOrderBatch(orderId, restockLines, unshipped),
    db
      .update(order)
      .set({
        canceledAt: new Date(),
        fulfillmentStatus: "cancelled",
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(and(eq(order.id, orderId), inArray(order.status, [...OPEN_ORDER_STATUSES]), unshipped))
      .returning({ id: order.id }),
  ]
}
