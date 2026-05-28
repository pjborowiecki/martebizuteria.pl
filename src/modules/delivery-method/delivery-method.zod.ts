import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const deliveryMethodZodSchemas = {
  insert: createInsertSchema(deliveryMethod),
  select: createSelectSchema(deliveryMethod),
  update: createUpdateSchema(deliveryMethod)
};
