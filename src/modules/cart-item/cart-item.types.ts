import type { cartItem } from "~/src/modules/cart-item/cart-item.schema";

export interface CartItem {
  insert: typeof cartItem.$inferInsert;
  select: typeof cartItem.$inferSelect;
}
