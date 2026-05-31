import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { order } from "~/src/modules/order/order.schema";
import { productVariant } from "~/src/modules/product-variant/product-variant.schema";

export const orderItem = sqliteTable(
  "order_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    metadata: text("metadata"),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: text("product_id"),
    quantity: integer("quantity").notNull(),
    subtotal: integer("subtotal").notNull(),
    thumbnail: text("thumbnail", { length: 2048 }),
    title: text("title", { length: 512 }).notNull(),
    total: integer("total").notNull(),
    unitPrice: integer("unit_price").notNull(),
    variantId: text("variant_id").references(() => productVariant.id, { onDelete: "set null" }),
    variantTitle: text("variant_title", { length: 512 }),
    ...timestamps()
  },
  (table) => [index("order_item_orderId_idx").on(table.orderId)]
);

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id]
  }),
  variant: one(productVariant, {
    fields: [orderItem.variantId],
    references: [productVariant.id]
  })
}));
