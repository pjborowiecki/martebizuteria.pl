import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import {
  ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH,
  ATTRIBUTE_ON_PRODUCT_DEFAULT_RANK,
} from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { product } from "~/src/modules/product/product.schema"

export const attributeOnProduct = sqliteTable(
  "attribute_on_product",
  {
    attributeId: text("attribute_id", { length: ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.attributeId })
      .notNull()
      .references(() => productAttribute.id, { onDelete: "restrict" }),
    id: text("id", { length: ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.id })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id", { length: ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.productId })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull().default(ATTRIBUTE_ON_PRODUCT_DEFAULT_RANK),
    value: text("value", { length: ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.value }).notNull(),
    variantId: text("variant_id", { length: ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.variantId }).references(() => productVariant.id, {
      onDelete: "cascade",
    }),
    ...timestamps(),
  },
  (table) => [
    index("attribute_on_product_attributeId_idx").on(table.attributeId),
    index("attribute_on_product_variantId_idx").on(table.variantId),
    uniqueIndex("attribute_on_product_scope_attribute_uidx").on(table.productId, table.attributeId, sql`coalesce(${table.variantId}, '')`),
  ],
)

export const attributeOnProductRelations = relations(attributeOnProduct, ({ one }) => ({
  product: one(product, {
    fields: [attributeOnProduct.productId],
    references: [product.id],
  }),
  productAttribute: one(productAttribute, {
    fields: [attributeOnProduct.attributeId],
    references: [productAttribute.id],
  }),
  variant: one(productVariant, {
    fields: [attributeOnProduct.variantId],
    references: [productVariant.id],
  }),
}))
