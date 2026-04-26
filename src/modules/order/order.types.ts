import type { order } from "~/src/modules/order/order.schema";

export interface Order {
  insert: typeof order.$inferInsert;
  select: typeof order.$inferSelect;
}
