import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod/v4"

import { courier } from "~/src/modules/courier/courier.schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z,
})

export const courierZodSchemas = {
  insert: createInsertSchema(courier),
  select: createSelectSchema(courier),
  update: createUpdateSchema(courier),
}
