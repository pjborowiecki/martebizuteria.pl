import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { product } from "~/src/modules/product/product.schema";

const DEFAULT_INVENTORY_QUANTITY = 0;
const DEFAULT_PRICE = 0;

export const productVariant = sqliteTable(
  "product_variant",
  {
    allowBackorder: integer("allow_backorder", { mode: "boolean" }).default(false).notNull(),
    barcode: text("barcode", { length: 255 }),
    compareAtPrice: real("compare_at_price"),
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    id: text("id").primaryKey(),
    inventoryQuantity: integer("inventory_quantity").default(DEFAULT_INVENTORY_QUANTITY).notNull(),
    manageInventory: integer("manage_inventory", { mode: "boolean" }).default(true).notNull(),
    metadata: text("metadata"),
    price: real("price").default(DEFAULT_PRICE).notNull(),
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
  product: one(product, {
    fields: [productVariant.productId],
    references: [product.id]
  })
}));
