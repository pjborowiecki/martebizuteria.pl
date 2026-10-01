import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { cart } from "~/src/modules/cart/cart.schema"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { DISCOUNT_TYPES } from "~/src/modules/discount/discount.constants"
import { order } from "~/src/modules/order/order.schema"
import { user } from "~/src/modules/user/user.schema"

export const discount = sqliteTable(
  "discount",
  {
    code: text("code").notNull().unique(),
    description: text("description", { length: 512 }),
    endsAt: timestamp("ends_at"),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    maxDiscountAmount: integer("max_discount_amount"),
    minOrderTotal: integer("min_order_total"),
    perCustomerLimit: integer("per_customer_limit"),
    startsAt: timestamp("starts_at"),
    type: text("type", { enum: DISCOUNT_TYPES }).notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    usageLimit: integer("usage_limit"),
    value: integer("value").notNull(),
    ...timestamps(),
  },
  (table) => [index("discount_code_idx").on(table.code), index("discount_isActive_idx").on(table.isActive)],
)

export const discountRedemption = sqliteTable(
  "discount_redemption",
  {
    amount: integer("amount").notNull(),
    discountId: text("discount_id")
      .references(() => discount.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email", { length: 320 }).notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id").references(() => order.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [
    index("discount_redemption_discountId_idx").on(table.discountId),
    index("discount_redemption_discountId_email_idx").on(table.discountId, table.email),
    uniqueIndex("discount_redemption_orderId_unique").on(table.orderId),
  ],
)

export const discountRelations = relations(discount, ({ many }) => ({
  carts: many(cart),
  checkouts: many(checkout),
  orders: many(order),
  redemptions: many(discountRedemption),
}))

export const discountRedemptionRelations = relations(discountRedemption, ({ one }) => ({
  discount: one(discount, {
    fields: [discountRedemption.discountId],
    references: [discount.id],
  }),
  order: one(order, {
    fields: [discountRedemption.orderId],
    references: [order.id],
  }),
  user: one(user, {
    fields: [discountRedemption.userId],
    references: [user.id],
  }),
}))
