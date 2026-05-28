import type { cart } from "~/src/modules/cart/cart.schema";

export interface Cart {
  insert: typeof cart.$inferInsert;
  select: typeof cart.$inferSelect;
}
