import { type z } from "zod/v4"

import { type attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

export type AttributeOnProductRow = z.infer<(typeof attributeOnProductZodSchemas)["row"]>

export interface FulfillmentTimeAttribute {
  readonly allowedValues: readonly ProductAttribute["allowedValue"][] | null
  readonly type: ProductAttribute["select"]["type"]
  readonly unit: string | null
  readonly value: string
}
