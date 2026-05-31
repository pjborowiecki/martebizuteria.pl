import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { productVariant } from "~/src/modules/product-variant/product-variant.schema";

const DEFAULT_QUANTITY = 0;
const DEFAULT_VERSION = 1;

export const inventory = sqliteTable(
  "inventory",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quantityAvailable: integer("quantity_available").default(DEFAULT_QUANTITY).notNull(),
    quantityReserved: integer("quantity_reserved").default(DEFAULT_QUANTITY).notNull(),
    variantId: text("variant_id")
      .references(() => productVariant.id, { onDelete: "cascade" })
      .notNull(),
    version: integer("version").default(DEFAULT_VERSION).notNull(),
    ...timestamps()
  },
  (table) => [index("inventory_variantId_idx").on(table.variantId)]
);

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariant, {
    fields: [inventory.variantId],
    references: [productVariant.id]
  })
}));
