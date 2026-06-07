import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod/v4";

import { order } from "~/src/modules/order/order.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

export const orderZodSchemas = {
  adminOrderIdInput: z.object({
    orderId: z.uuid()
  }),
  insert: createInsertSchema(order),
  select: createSelectSchema(order),
  update: createUpdateSchema(order)
};

export type OrderStatus = (typeof order.$inferSelect)["status"];
export type OrderFulfillmentStatus = (typeof order.$inferSelect)["fulfillmentStatus"];
