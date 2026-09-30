import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema"
import {
  PRODUCT_ATTRIBUTE_COLUMN_LENGTH,
  PRODUCT_ATTRIBUTE_DEFAULT_RANK,
  PRODUCT_ATTRIBUTE_TYPES,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

export const productAttribute = sqliteTable(
  "product_attribute",
  {
    allowedValues: text("allowed_values", { mode: "json" }).$type<ProductAttribute["allowedValue"][] | null>(),
    handle: text("handle", { length: PRODUCT_ATTRIBUTE_COLUMN_LENGTH.handle }).notNull().unique(),
    id: text("id", { length: PRODUCT_ATTRIBUTE_COLUMN_LENGTH.id }).primaryKey(),
    rank: integer("rank").notNull().default(PRODUCT_ATTRIBUTE_DEFAULT_RANK),
    titles: text("titles", { mode: "json" }).$type<ProductAttribute["localeMap"]>().notNull(),
    type: text("type", { enum: PRODUCT_ATTRIBUTE_TYPES }).notNull(),
    unit: text("unit", { length: PRODUCT_ATTRIBUTE_COLUMN_LENGTH.unit }),
    ...timestamps(),
  },
  (table) => [index("product_attribute_rank_idx").on(table.rank)],
)

export const productAttributeRelations = relations(productAttribute, ({ many }) => ({
  attributeOnProducts: many(attributeOnProduct),
}))
