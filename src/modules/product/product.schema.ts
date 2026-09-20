import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { productImage } from "~/src/modules/product-image/product-image.schema"
import { productOption } from "~/src/modules/product-option/product-option.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import {
  DEFAULT_PRODUCT_STATUS,
  PRODUCT_COLUMN_LENGTH,
  PRODUCT_DEFAULT_RANK,
  PRODUCT_STATUSES,
} from "~/src/modules/product/product.constants"
import { type ProductLocaleMap, type ProductTagsLocaleMap } from "~/src/modules/product/product.types"

export const product = sqliteTable(
  "product",
  {
    descriptions: text("descriptions", { mode: "json" }).$type<ProductLocaleMap | null>(),
    handle: text("handle", { length: PRODUCT_COLUMN_LENGTH.handle }).notNull().unique(),
    id: text("id", { length: PRODUCT_COLUMN_LENGTH.id }).primaryKey(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, never> | null>(),
    primaryCategoryId: text("primary_category_id", { length: PRODUCT_COLUMN_LENGTH.id }),
    rank: integer("rank").notNull().default(PRODUCT_DEFAULT_RANK),
    status: text("status", { enum: PRODUCT_STATUSES }).default(DEFAULT_PRODUCT_STATUS).notNull(),
    subtitles: text("subtitles", { mode: "json" }).$type<ProductLocaleMap | null>(),
    tags: text("tags", { mode: "json" }).$type<ProductTagsLocaleMap | null>(),
    thumbnail: text("thumbnail", { length: PRODUCT_COLUMN_LENGTH.thumbnail }),
    titles: text("titles", { mode: "json" }).$type<ProductLocaleMap>().notNull(),
    ...timestamps(),
  },
  (table) => [
    index("product_primary_category_id_idx").on(table.primaryCategoryId),
    index("product_rank_idx").on(table.rank),
    index("product_status_createdAt_idx").on(table.status, table.createdAt),
    index("product_status_rank_idx").on(table.status, table.rank),
    index("product_status_updatedAt_idx").on(table.status, table.updatedAt),
  ],
)

export const productRelations = relations(product, ({ many }) => ({
  attributes: many(attributeOnProduct),
  categories: many(categoryOnProduct),
  collections: many(collectionOnProduct),
  images: many(productImage),
  options: many(productOption),
  variants: many(productVariant),
}))
