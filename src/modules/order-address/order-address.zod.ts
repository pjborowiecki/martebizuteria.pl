import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { orderAddress } from "~/src/modules/order-address/order-address.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const orderAddressZodSchemas = {
  insert: createInsertSchema(orderAddress),
  select: createSelectSchema(orderAddress),
  update: createUpdateSchema(orderAddress)
};

// Derived enum type — inferred from column definition, exported for reuse
export type OrderAddressType = (typeof orderAddress.$inferSelect)["type"];
