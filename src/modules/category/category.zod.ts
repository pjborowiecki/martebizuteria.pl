import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { category } from "~/src/modules/category/category.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const categoryZodSchemas = {
  insert: createInsertSchema(category),
  select: createSelectSchema(category),
  update: createUpdateSchema(category)
};
