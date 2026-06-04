import { z } from "zod/v4";

import { PRODUCT_IMAGE_COLUMN_LENGTH } from "~/src/modules/product-image/product-image.constants";

const MIN_LENGTH = 1;
const MIN_RANK = 0;

const productImageIdSchema = z.string().trim().min(MIN_LENGTH).max(PRODUCT_IMAGE_COLUMN_LENGTH.id);

const productImageRowSchema = z.object({
  alt: z.string().trim().max(PRODUCT_IMAGE_COLUMN_LENGTH.alt).default(""),
  id: productImageIdSchema.optional(),
  rank: z.number().int().min(MIN_RANK),
  url: z.string().trim().min(MIN_LENGTH).max(PRODUCT_IMAGE_COLUMN_LENGTH.url)
});

export const productImageZodSchemas = {
  deleteInput: z.array(productImageIdSchema).min(MIN_LENGTH),
  reorderInput: z.array(productImageIdSchema).min(MIN_LENGTH),
  replaceForProductInput: z.object({
    images: z.array(productImageRowSchema),
    productId: productImageIdSchema
  })
};
