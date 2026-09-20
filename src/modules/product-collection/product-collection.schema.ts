import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import {
  COLLECTION_DEFAULT_RANK,
  COLLECTION_STATUSES,
  DEFAULT_COLLECTION_STATUS,
} from "~/src/modules/product-collection/product-collection.constants"
import { type CollectionLocaleMap } from "~/src/modules/product-collection/product-collection.types"

export const productCollection = sqliteTable(
  "product_collection",
  {
    descriptions: text("descriptions", { mode: "json" }).$type<CollectionLocaleMap | null>(),
    handle: text("handle", { length: 255 }).notNull().unique(),
    id: text("id", { length: 36 }).primaryKey(),
    image: text("image", { length: 2048 }),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, never> | null>(),
    rank: integer("rank").notNull().default(COLLECTION_DEFAULT_RANK),
    status: text("status", { enum: COLLECTION_STATUSES }).notNull().default(DEFAULT_COLLECTION_STATUS),
    titles: text("titles", { mode: "json" }).$type<CollectionLocaleMap>().notNull(),
    ...timestamps(),
  },
  (table) => [index("product_collection_status_rank_idx").on(table.status, table.rank)],
)

export const productCollectionRelations = relations(productCollection, ({ many }) => ({
  collectionOnProducts: many(collectionOnProduct),
}))
