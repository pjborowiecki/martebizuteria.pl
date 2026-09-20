import { relations } from "drizzle-orm"
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { cartItem } from "~/src/modules/cart-item/cart-item.schema"
import { discount } from "~/src/modules/discount/discount.schema"
import { user } from "~/src/modules/user/user.schema"

export const cart = sqliteTable(
  "cart",
  {
    discountId: text("discount_id"),
    expiresAt: timestamp("expires_at"),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id"),
    // Nullable for guest checkouts
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [index("cart_userId_idx").on(table.userId), index("cart_sessionId_idx").on(table.sessionId)],
)

export const cartRelations = relations(cart, ({ one, many }) => ({
  discount: one(discount, {
    fields: [cart.discountId],
    references: [discount.id],
  }),
  items: many(cartItem),
  user: one(user, {
    fields: [cart.userId],
    references: [user.id],
  }),
}))
