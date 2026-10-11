import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { PRICE_HISTORY_COLUMN_LENGTH } from "~/src/modules/price-history/price-history.constants"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"

export const priceHistory = sqliteTable(
  "price_history",
  {
    changedAt: timestamp("changed_at").notNull(),
    compareAtPrice: integer("compare_at_price"),
    id: integer("id").primaryKey(),
    price: integer("price").notNull(),
    variantId: text("variant_id", { length: PRICE_HISTORY_COLUMN_LENGTH.variantId })
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
  },
  (table) => [index("price_history_variantId_idx").on(table.variantId)],
)
