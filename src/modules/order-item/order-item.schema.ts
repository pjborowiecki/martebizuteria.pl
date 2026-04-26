import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { order } from "~/src/modules/order/order.schema";

export const orderItem = sqliteTable(
  "order_item",
  {
    id: text("id").primaryKey(),
    metadata: text("metadata"),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: text("product_id"),
    quantity: text("quantity").notNull(),
    thumbnail: text("thumbnail", { length: 2048 }),
    title: text("title", { length: 512 }).notNull(),
    unitPrice: text("unit_price").notNull(),
    variantId: text("variant_id"),
    variantTitle: text("variant_title", { length: 512 })
  },
  (table) => [index("order_item_orderId_idx").on(table.orderId)]
);

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id]
  })
}));
