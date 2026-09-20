import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { cart } from "~/src/modules/cart/cart.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { order } from "~/src/modules/order/order.schema"

export const discount = sqliteTable(
  "discount",
  {
    code: text("code").notNull().unique(),
    endsAt: timestamp("ends_at"),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    startsAt: timestamp("starts_at"),
    type: text("type", { enum: ["percentage", "fixed_amount", "free_shipping"] }).notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    usageLimit: integer("usage_limit"),
    value: integer("value").notNull(),
    ...timestamps(),
  },
  (table) => [index("discount_code_idx").on(table.code)],
)

export const discountRelations = relations(discount, ({ many }) => ({
  carts: many(cart),
  checkouts: many(checkout),
  orders: many(order),
}))
