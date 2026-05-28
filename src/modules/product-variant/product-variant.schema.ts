import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { inventory } from "~/src/modules/inventory/inventory.schema";
import { product } from "~/src/modules/product/product.schema";

const DEFAULT_PRICE = 0;

export const productVariant = sqliteTable(
  "product_variant",
  {
    barcode: text("barcode", { length: 255 }),
    compareAtPrice: integer("compare_at_price"),
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    id: text("id").primaryKey(),
    manageInventory: integer("manage_inventory", { mode: "boolean" }).default(true).notNull(),
    metadata: text("metadata"),
    price: integer("price").default(DEFAULT_PRICE).notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku", { length: 255 }).unique(),
    title: text("title", { length: 512 }).notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    weight: real("weight")
  },
  (table) => [index("product_variant_productId_idx").on(table.productId), index("product_variant_sku_idx").on(table.sku)]
);

export const productVariantRelations = relations(productVariant, ({ one }) => ({
  inventory: one(inventory, {
    fields: [productVariant.id],
    references: [inventory.variantId]
  }),
  product: one(product, {
    fields: [productVariant.productId],
    references: [product.id]
  })
}));
