import { relations } from "drizzle-orm"
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { CATEGORY_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/category-on-product/category-on-product.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { product } from "~/src/modules/product/product.schema"

export const categoryOnProduct = sqliteTable(
  "category_on_product",
  {
    categoryId: text("category_id", { length: CATEGORY_ON_PRODUCT_COLUMN_LENGTH.categoryId })
      .notNull()
      .references(() => productCategory.id, { onDelete: "cascade" }),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    productId: text("product_id", { length: CATEGORY_ON_PRODUCT_COLUMN_LENGTH.productId })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index("category_on_product_category_id_idx").on(table.categoryId),
    index("category_on_product_product_id_idx").on(table.productId),
  ],
)

export const categoryOnProductRelations = relations(categoryOnProduct, ({ one }) => ({
  product: one(product, {
    fields: [categoryOnProduct.productId],
    references: [product.id],
  }),
  productCategory: one(productCategory, {
    fields: [categoryOnProduct.categoryId],
    references: [productCategory.id],
  }),
}))
