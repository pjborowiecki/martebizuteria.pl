import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestampNow, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { cart } from "~/src/modules/cart/cart.schema";
import { productVariant } from "~/src/modules/product-variant/product-variant.schema";

const DEFAULT_QUANTITY = 1;

export const cartItem = sqliteTable(
  "cart_item",
  {
    addedAt: timestampNow("added_at"),
    cartId: text("cart_id")
      .references(() => cart.id, { onDelete: "cascade" })
      .notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quantity: integer("quantity").default(DEFAULT_QUANTITY).notNull(),
    variantId: text("variant_id")
      .references(() => productVariant.id, { onDelete: "cascade" })
      .notNull(),
    ...timestamps()
  },
  (table) => [index("cartItem_cartId_idx").on(table.cartId), index("cartItem_variantId_idx").on(table.variantId)]
);

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItem.cartId],
    references: [cart.id]
  }),
  variant: one(productVariant, {
    fields: [cartItem.variantId],
    references: [productVariant.id]
  })
}));
