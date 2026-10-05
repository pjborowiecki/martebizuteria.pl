import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordOrderRestockedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getRestockLinesForOrder } from "~/src/modules/order/order.accessors"
import { prepareRestockOrderBatch } from "~/src/modules/order/order.utils"

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
