import zod from "zod/v4"

import { idField } from "~/src/modules/_core/utils/zod-fields"
import { ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { PRODUCT_ATTRIBUTE_COLUMN_LENGTH } from "~/src/modules/product-attribute/product-attribute.constants"
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"

const attributeIdSchema = zod.string().trim().min(1).max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.id)

const attributeOnProductRowSchema = zod.object({
  attributeId: attributeIdSchema,
  id: zod.string().optional(),
  rank: zod.number().int().min(0).optional(),
  value: zod.string().trim().max(ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.value),
})

const attributeOnProductVariantRowSchema = zod.object({
  values: zod.array(attributeOnProductRowSchema),
  variantId: zod.string().trim().min(1).max(PRODUCT_COLUMN_LENGTH.id),
})

export const attributeOnProductZodSchemas = {
  productIdInput: idField,
  row: attributeOnProductRowSchema,
  setAllForProductInput: zod.object({
    productId: zod.string().trim().min(1).max(PRODUCT_COLUMN_LENGTH.id),
    productValues: zod.array(attributeOnProductRowSchema),
    variantValues: zod.array(attributeOnProductVariantRowSchema),
  }),
  setForProductInput: zod.object({
    productId: zod.string().trim().min(1).max(PRODUCT_COLUMN_LENGTH.id),
    values: zod.array(attributeOnProductRowSchema),
  }),
}
