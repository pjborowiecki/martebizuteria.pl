import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { inventory } from "~/src/modules/inventory/inventory.schema";
import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema";
import {
  PRODUCT_VARIANT_COLUMN_LENGTH,
  PRODUCT_VARIANT_DEFAULT_MANAGE_INVENTORY,
  PRODUCT_VARIANT_DEFAULT_PRICE_MINOR
} from "~/src/modules/product-variant/product-variant.constants";
import { product } from "~/src/modules/product/product.schema";

export const productVariant = sqliteTable(
  "product_variant",
  {
    barcode: text("barcode", { length: PRODUCT_VARIANT_COLUMN_LENGTH.barcode }),
    compareAtPrice: integer("compare_at_price"),
    id: text("id", { length: PRODUCT_VARIANT_COLUMN_LENGTH.id }).primaryKey(),
    manageInventory: integer("manage_inventory", { mode: "boolean" }).default(PRODUCT_VARIANT_DEFAULT_MANAGE_INVENTORY).notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, never> | null>(),
    price: integer("price").default(PRODUCT_VARIANT_DEFAULT_PRICE_MINOR).notNull(),
    productId: text("product_id", { length: PRODUCT_VARIANT_COLUMN_LENGTH.productId })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku", { length: PRODUCT_VARIANT_COLUMN_LENGTH.sku }).unique(),
    title: text("title", { length: PRODUCT_VARIANT_COLUMN_LENGTH.title }).notNull(),
    weight: real("weight"),
    ...timestamps()
  },
  (table) => [index("product_variant_productId_idx").on(table.productId), index("product_variant_sku_idx").on(table.sku)]
);

export const productVariantRelations = relations(productVariant, ({ one, many }) => ({
  inventory: one(inventory, {
    fields: [productVariant.id],
    references: [inventory.variantId]
  }),
  optionOnVariants: many(optionOnVariant),
  product: one(product, {
    fields: [productVariant.productId],
    references: [product.id]
  })
}));
