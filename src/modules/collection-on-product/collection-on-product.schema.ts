import { relations } from "drizzle-orm"
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { COLLECTION_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/collection-on-product/collection-on-product.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { product } from "~/src/modules/product/product.schema"

export const collectionOnProduct = sqliteTable(
  "collection_on_product",
  {
    collectionId: text("collection_id", { length: COLLECTION_ON_PRODUCT_COLUMN_LENGTH.collectionId })
      .notNull()
      .references(() => productCollection.id, { onDelete: "cascade" }),
    productId: text("product_id", { length: COLLECTION_ON_PRODUCT_COLUMN_LENGTH.productId })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.collectionId] }),
    index("collection_on_product_collection_id_idx").on(table.collectionId),
    index("collection_on_product_collection_rank_idx").on(table.collectionId, table.rank),
    index("collection_on_product_product_id_idx").on(table.productId),
  ],
)

export const collectionOnProductRelations = relations(collectionOnProduct, ({ one }) => ({
  product: one(product, {
    fields: [collectionOnProduct.productId],
    references: [product.id],
  }),
  productCollection: one(productCollection, {
    fields: [collectionOnProduct.collectionId],
    references: [productCollection.id],
  }),
}))
