import { relations, sql } from "drizzle-orm";
import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "~/src/modules/user/user.schema";

const DEFAULT_MONETARY_VALUE = 0;

export const order = sqliteTable(
  "order",
  {
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    currencyCode: text("currency_code", { length: 3 }).default("PLN").notNull(),
    discountTotal: real("discount_total").default(DEFAULT_MONETARY_VALUE).notNull(),
    email: text("email", { length: 320 }).notNull(),
    fulfillmentStatus: text("fulfillment_status", {
      enum: ["not_fulfilled", "partially_fulfilled", "fulfilled", "shipped", "delivered", "cancelled"]
    })
      .default("not_fulfilled")
      .notNull(),
    id: text("id").primaryKey(),
    metadata: text("metadata"),
    paymentStatus: text("payment_status", {
      enum: ["awaiting", "captured", "refunded", "failed"]
    })
      .default("awaiting")
      .notNull(),
    shippingTotal: real("shipping_total").default(DEFAULT_MONETARY_VALUE).notNull(),
    status: text("status", {
      enum: ["pending", "processing", "completed", "cancelled", "refunded"]
    })
      .default("pending")
      .notNull(),
    subtotal: real("subtotal").default(DEFAULT_MONETARY_VALUE).notNull(),
    taxTotal: real("tax_total").default(DEFAULT_MONETARY_VALUE).notNull(),
    total: real("total").default(DEFAULT_MONETARY_VALUE).notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" })
  },
  (table) => [
    index("order_userId_idx").on(table.userId),
    index("order_status_idx").on(table.status),
    index("order_createdAt_idx").on(table.createdAt)
  ]
);

export const orderRelations = relations(order, ({ one }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id]
  })
}));
