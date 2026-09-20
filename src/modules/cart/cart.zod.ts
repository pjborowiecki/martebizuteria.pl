import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { cart } from "~/src/modules/cart/cart.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

export const cartZodSchemas = {
  insert: createInsertSchema(cart),
  select: createSelectSchema(cart),
  update: createUpdateSchema(cart),
}
