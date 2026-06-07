import { z } from "zod/v4";

import { ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/attribute-on-product/attribute-on-product.constants";
import { PRODUCT_ATTRIBUTE_COLUMN_LENGTH } from "~/src/modules/product-attribute/product-attribute.constants";
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

const MIN_LENGTH = 1;
const MIN_RANK = 0;

const attributeIdSchema = z.string().trim().min(MIN_LENGTH).max(PRODUCT_ATTRIBUTE_COLUMN_LENGTH.id);

const attributeOnProductRowSchema = z.object({
  attributeId: attributeIdSchema,
  id: z.string().optional(),
  rank: z.number().int().min(MIN_RANK).optional(),
  value: z.string().trim().max(ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.value)
});

export const attributeOnProductZodSchemas = {
  row: attributeOnProductRowSchema,
  setAllForProductInput: z.object({
    productId: z.string().trim().min(MIN_LENGTH).max(PRODUCT_COLUMN_LENGTH.id),
    productValues: z.array(attributeOnProductRowSchema),
    variantValues: z.array(
      z.object({
        values: z.array(attributeOnProductRowSchema),
        variantId: z.string().trim().min(MIN_LENGTH).max(PRODUCT_COLUMN_LENGTH.id)
      })
    )
  }),
  setForProductInput: z.object({
    productId: z.string().trim().min(MIN_LENGTH).max(PRODUCT_COLUMN_LENGTH.id),
    values: z.array(attributeOnProductRowSchema)
  })
};
