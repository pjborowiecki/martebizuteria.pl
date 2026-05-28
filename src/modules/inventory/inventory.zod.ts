import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { inventory } from "~/src/modules/inventory/inventory.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const inventoryZodSchemas = {
  insert: createInsertSchema(inventory),
  select: createSelectSchema(inventory),
  update: createUpdateSchema(inventory)
};
