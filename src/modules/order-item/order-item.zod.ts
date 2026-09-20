import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { orderItem } from "~/src/modules/order-item/order-item.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

export const orderItemZodSchemas = {
  insert: createInsertSchema(orderItem),
  select: createSelectSchema(orderItem),
  update: createUpdateSchema(orderItem),
}
