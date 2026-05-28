import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { cart } from "~/src/modules/cart/cart.schema";
import { checkout } from "~/src/modules/checkout/checkout.schema";
import { order } from "~/src/modules/order/order.schema";

const DEFAULT_USAGE_COUNT = 0;

export const discount = sqliteTable(
  "discount",
  {
    code: text("code").notNull().unique(),
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    endsAt: text("ends_at"),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    startsAt: text("starts_at"),
    type: text("type", { enum: ["percentage", "fixed_amount", "free_shipping"] }).notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    usageCount: integer("usage_count").default(DEFAULT_USAGE_COUNT).notNull(),
    usageLimit: integer("usage_limit"),
    value: integer("value").notNull()
  },
  (table) => [index("discount_code_idx").on(table.code)]
);

export const discountRelations = relations(discount, ({ many }) => ({
  carts: many(cart),
  checkouts: many(checkout),
  orders: many(order)
}));
