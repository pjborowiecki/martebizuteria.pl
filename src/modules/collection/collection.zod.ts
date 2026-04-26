import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { collection } from "~/src/modules/collection/collection.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const collectionZodSchemas = {
  insert: createInsertSchema(collection),
  select: createSelectSchema(collection),
  update: createUpdateSchema(collection)
};
