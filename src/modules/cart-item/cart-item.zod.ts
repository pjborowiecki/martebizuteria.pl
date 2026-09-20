import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { cartItem } from "~/src/modules/cart-item/cart-item.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

export const cartItemZodSchemas = {
  insert: createInsertSchema(cartItem),
  select: createSelectSchema(cartItem),
  update: createUpdateSchema(cartItem),
}
