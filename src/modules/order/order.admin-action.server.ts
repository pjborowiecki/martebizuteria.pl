import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"
export const getAdminOrderActionRow = (orderId: string): Promise<AdminOrderActionRow | undefined> =>
  db.query.order.findFirst({
    columns: {
      fulfillmentStatus: true,
      status: true,
    },
    where: eq(order.id, orderId),
  })

export const assertOrderActionState = (
  row: AdminOrderActionRow | undefined,
  predicate: (snapshot: AdminOrderActionRow) => boolean,
): AdminOrderActionRow => {
  if (row === undefined) {
    throw new Error(ORDER_ERROR_CODES.NOT_FOUND)
  }
  if (!predicate(row)) {
    throw new Error(ORDER_ERROR_CODES.INVALID_STATE)
  }
  return row
}
interface AdminOrderActionRow {
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly status: Order["select"]["status"]
}
