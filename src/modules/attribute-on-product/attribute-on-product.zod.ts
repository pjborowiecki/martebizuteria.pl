import { z } from "zod/v4"

import { ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { PRODUCT_ATTRIBUTE_COLUMN_LENGTH } from "~/src/modules/product-attribute/product-attribute.constants"
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"

const attributeIdSchema = z.string().trim().min(1).max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.id)

const attributeOnProductRowSchema = z.object({
  attributeId: attributeIdSchema,
  id: z.string().optional(),
  rank: z.number().int().min(0).optional(),
  value: z.string().trim().max(ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.value),
})

const attributeOnProductVariantRowSchema = z.object({
  values: z.array(attributeOnProductRowSchema),
  variantId: z.string().trim().min(1).max(PRODUCT_COLUMN_LENGTH.id),
})

export const attributeOnProductZodSchemas = {
  row: attributeOnProductRowSchema,
  setAllForProductInput: z.object({
    productId: z.string().trim().min(1).max(PRODUCT_COLUMN_LENGTH.id),
    productValues: z.array(attributeOnProductRowSchema),
    variantValues: z.array(attributeOnProductVariantRowSchema),
  }),
  setForProductInput: z.object({
    productId: z.string().trim().min(1).max(PRODUCT_COLUMN_LENGTH.id),
    values: z.array(attributeOnProductRowSchema),
  }),
}
