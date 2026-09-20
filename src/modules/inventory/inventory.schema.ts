import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { INVENTORY_COLUMN_LENGTH, INVENTORY_DEFAULT_QUANTITY, INVENTORY_DEFAULT_VERSION } from "~/src/modules/inventory/inventory.constants"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"

export const inventory = sqliteTable(
  "inventory",
  {
    id: text("id", { length: INVENTORY_COLUMN_LENGTH.id })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quantityAvailable: integer("quantity_available").default(INVENTORY_DEFAULT_QUANTITY).notNull(),
    quantityReserved: integer("quantity_reserved").default(INVENTORY_DEFAULT_QUANTITY).notNull(),
    variantId: text("variant_id", { length: INVENTORY_COLUMN_LENGTH.variantId })
      .references(() => productVariant.id, { onDelete: "cascade" })
      .notNull(),
    version: integer("version").default(INVENTORY_DEFAULT_VERSION).notNull(),
    ...timestamps(),
  },
  (table) => [index("inventory_variantId_idx").on(table.variantId), uniqueIndex("inventory_variantId_unique").on(table.variantId)],
)

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariant, {
    fields: [inventory.variantId],
    references: [productVariant.id],
  }),
}))
