import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { order } from "~/src/modules/order/order.schema";

export const orderAddress = sqliteTable(
  "order_address",
  {
    address1: text("address1", { length: 512 }).notNull(),
    address2: text("address2", { length: 512 }),
    city: text("city", { length: 256 }).notNull(),
    countryCode: text("country_code", { length: 2 }).notNull(),
    firstName: text("first_name", { length: 256 }).notNull(),
    id: text("id").primaryKey(),
    lastName: text("last_name", { length: 256 }).notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    phone: text("phone", { length: 32 }),
    postalCode: text("postal_code", { length: 32 }),
    province: text("province", { length: 256 }),
    type: text("type", { enum: ["shipping", "billing"] }).notNull()
  },
  (table) => [index("order_address_orderId_idx").on(table.orderId), index("order_address_type_idx").on(table.type)]
);

export const orderAddressRelations = relations(orderAddress, ({ one }) => ({
  order: one(order, {
    fields: [orderAddress.orderId],
    references: [order.id]
  })
}));
