import { type SQL, and, eq, exists, isNull, ne, sql } from "drizzle-orm"
import { type BatchItem } from "drizzle-orm/batch"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordOrderRestockedAudit } from "~/src/modules/audit-log/use-cases/record-order-audit.server"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { getRestockLinesForOrder } from "~/src/modules/order/order.accessors"
import { order } from "~/src/modules/order/order.schema"
import { type RestockLine } from "~/src/modules/order/order.types"

const existsOrderWhere = (condition: SQL | undefined): SQL => exists(db.select({ id: order.id }).from(order).where(condition))

const prepareRestockWhile = (orderHoldsStock: SQL, line: RestockLine): BatchItem<"sqlite"> =>
  db
    .update(inventory)
    .set({
      quantityAvailable: sql`${inventory.quantityAvailable} + ${line.quantity}`,
    })
    .where(and(eq(inventory.variantId, line.variantId), orderHoldsStock))

export const prepareRestockOrderBatch = (
  orderId: string,
  restockLines: readonly RestockLine[],
  onlyWhile?: SQL,
): [...BatchItem<"sqlite">[], BatchItem<"sqlite">] => {
  const orderNotYetRestocked = and(eq(order.id, orderId), ne(order.status, "cancelled"), onlyWhile, isNull(order.restockedAt))

  return [
    ...restockLines.map((line) => prepareRestockWhile(existsOrderWhere(orderNotYetRestocked), line)),
    db
      .update(order)
      .set({
        restockedAt: new Date(),
      })
      .where(orderNotYetRestocked)
      .returning({ id: order.id }),
  ]
}

export const returnOrderToStock = async (orderId: string): Promise<boolean> => {
  const orderLines = await getRestockLinesForOrder(orderId)
  const restockLines = orderLines.filter(
    (
      line,
    ): line is {
      quantity: number
      variantId: string
    } => line.variantId !== null,
  )

  const [first, ...rest] = prepareRestockOrderBatch(orderId, restockLines)
  const results = await db.batch([first, ...rest])
  const restocked: unknown = results.at(-1)
  if (!Array.isArray(restocked) || restocked.length === 0) {
    return false
  }

  recordOrderRestockedAudit(orderId)
  scheduleProductCatalogInvalidation()

  return true
}
