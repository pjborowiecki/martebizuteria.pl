import { type deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

export interface DeliveryMethod {
  names: ProductAttribute["localeMap"]
  select: typeof deliveryMethod.$inferSelect
}
