import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { payment } from "~/src/modules/payment/payment.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const paymentZodSchemas = {
  insert: createInsertSchema(payment),
  select: createSelectSchema(payment),
  update: createUpdateSchema(payment)
};
