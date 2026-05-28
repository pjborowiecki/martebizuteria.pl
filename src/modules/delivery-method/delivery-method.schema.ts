import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { checkout } from "~/src/modules/checkout/checkout.schema";
import { courier } from "~/src/modules/courier/courier.schema";
import { order } from "~/src/modules/order/order.schema";

export const deliveryMethod = sqliteTable("delivery_method", {
  apiServiceCode: text("api_service_code").notNull(),
  courierId: text("courier_id")
    .references(() => courier.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: text("created_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  description: text("description"),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  type: text("type", { enum: ["locker", "courier", "in_store"] }).notNull(),
  updatedAt: text("updated_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString())
    .notNull()
});

export const deliveryMethodRelations = relations(deliveryMethod, ({ one, many }) => ({
  checkouts: many(checkout),
  courier: one(courier, {
    fields: [deliveryMethod.courierId],
    references: [courier.id]
  }),
  orders: many(order)
}));
