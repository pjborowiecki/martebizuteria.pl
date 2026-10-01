import { relations } from "drizzle-orm"
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { product } from "~/src/modules/product/product.schema"
import { user } from "~/src/modules/user/user.schema"

export const wishlistItem = sqliteTable(
  "wishlist_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .references(() => product.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("wishlist_item_userId_productId_unique").on(table.userId, table.productId),
    index("wishlist_item_userId_createdAt_idx").on(table.userId, table.createdAt),
  ],
)

export const wishlistItemRelations = relations(wishlistItem, ({ one }) => ({
  product: one(product, {
    fields: [wishlistItem.productId],
    references: [product.id],
  }),
  user: one(user, {
    fields: [wishlistItem.userId],
    references: [user.id],
  }),
}))
