import { type orderAddress } from "~/src/modules/order-address/order-address.schema"

export interface OrderAddress {
  insert: typeof orderAddress.$inferInsert
  select: typeof orderAddress.$inferSelect
}
