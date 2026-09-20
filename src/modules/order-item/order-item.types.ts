import { type orderItem } from "~/src/modules/order-item/order-item.schema"

export interface OrderItem {
  insert: typeof orderItem.$inferInsert
  select: typeof orderItem.$inferSelect
}
