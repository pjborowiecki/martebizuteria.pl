import { type deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"

export interface DeliveryMethod {
  insert: typeof deliveryMethod.$inferInsert
  select: typeof deliveryMethod.$inferSelect
}
