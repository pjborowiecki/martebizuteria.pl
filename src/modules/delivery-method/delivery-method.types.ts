import { type z } from "zod/v4"

import { type deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"
import { type deliveryMethodZodSchemas } from "~/src/modules/delivery-method/delivery-method.zod"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

interface AdminCourier {
  readonly id: string
  readonly internalCode: string
  readonly isActive: boolean
  readonly name: string
}

interface AdminDeliveryMethod {
  readonly archivedAt: Date | undefined
  readonly courier: AdminCourier
  readonly id: string
  readonly isActive: boolean
  readonly names: ProductAttribute["localeMap"]
  readonly price: number
  readonly type: DeliveryMethod["select"]["type"]
  readonly updatedAt: Date
}

export interface DeliveryMethod {
  adminCourier: AdminCourier
  adminList: { readonly couriers: readonly AdminCourier[]; readonly methods: readonly AdminDeliveryMethod[] }
  adminMethod: AdminDeliveryMethod
  createInput: z.input<(typeof deliveryMethodZodSchemas)["createInput"]>
  names: ProductAttribute["localeMap"]
  select: typeof deliveryMethod.$inferSelect
  updateInput: z.input<(typeof deliveryMethodZodSchemas)["updateInput"]>
}
