import { z } from "zod/v4"

import { PRODUCT_IMAGE_COLUMN_LENGTH } from "~/src/modules/product-image/product-image.constants"

const productImageIdSchema = z.string().trim().nonempty().max(PRODUCT_IMAGE_COLUMN_LENGTH.id)

const productImageRowSchema = z.object({
  alt: z.string().trim().max(PRODUCT_IMAGE_COLUMN_LENGTH.alt).optional(),
  id: productImageIdSchema.optional(),
  rank: z.number().int().min(0),
  url: z.string().trim().nonempty().max(PRODUCT_IMAGE_COLUMN_LENGTH.url),
  variantId: z.string().trim().nonempty().max(PRODUCT_IMAGE_COLUMN_LENGTH.variantId).optional(),
})

export const productImageZodSchemas = {
  deleteInput: z.array(productImageIdSchema).nonempty(),
  reorderInput: z.array(productImageIdSchema).nonempty(),
  replaceForProductInput: z.object({
    images: z.array(productImageRowSchema),
    productId: productImageIdSchema,
  }),
}
