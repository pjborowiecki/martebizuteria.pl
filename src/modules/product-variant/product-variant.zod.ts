import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { productVariant } from "~/src/modules/product-variant/product-variant.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

export const productVariantZodSchemas = {
  insert: createInsertSchema(productVariant),
  select: createSelectSchema(productVariant),
  update: createUpdateSchema(productVariant),
}
