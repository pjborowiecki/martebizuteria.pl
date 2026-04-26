import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { address } from "~/src/modules/address/address.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const addressZodSchemas = {
  insert: createInsertSchema(address),
  select: createSelectSchema(address),
  update: createUpdateSchema(address)
};
