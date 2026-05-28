import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { productVariant } from "~/src/modules/product-variant/product-variant.schema";

const DEFAULT_QUANTITY = 0;
const DEFAULT_VERSION = 1;

export const inventory = sqliteTable(
  "inventory",
  {
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quantityAvailable: integer("quantity_available").default(DEFAULT_QUANTITY).notNull(),
    quantityReserved: integer("quantity_reserved").default(DEFAULT_QUANTITY).notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    variantId: text("variant_id")
      .references(() => productVariant.id, { onDelete: "cascade" })
      .notNull(),
    version: integer("version").default(DEFAULT_VERSION).notNull()
  },
  (table) => [index("inventory_variantId_idx").on(table.variantId)]
);

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariant, {
    fields: [inventory.variantId],
    references: [productVariant.id]
  })
}));
