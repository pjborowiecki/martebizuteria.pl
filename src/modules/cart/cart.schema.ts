import { relations, sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { cartItem } from "~/src/modules/cart-item/cart-item.schema";
import { user } from "~/src/modules/user/user.schema";

export const cart = sqliteTable(
  "cart",
  {
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    discountId: text("discount_id"),
    // Useful for CRON cleanup jobs
    expiresAt: text("expires_at"),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Connect guest sessions
    sessionId: text("session_id"),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    // Nullable for guest checkouts
    userId: text("user_id").references(() => user.id, { onDelete: "set null" })
  },
  (table) => [index("cart_userId_idx").on(table.userId), index("cart_sessionId_idx").on(table.sessionId)]
);

export const cartRelations = relations(cart, ({ one, many }) => ({
  items: many(cartItem),
  user: one(user, {
    fields: [cart.userId],
    references: [user.id]
  })
}));
