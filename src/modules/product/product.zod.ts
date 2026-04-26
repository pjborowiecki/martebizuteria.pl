import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { product } from "~/src/modules/product/product.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const productZodSchemas = {
  insert: createInsertSchema(product),
  select: createSelectSchema(product),
  update: createUpdateSchema(product)
};

// Derived enum type — inferred from column definition, exported for reuse
export type ProductStatus = (typeof product.$inferSelect)["status"];
