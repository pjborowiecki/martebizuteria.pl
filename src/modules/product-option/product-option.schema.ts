import { relations } from "drizzle-orm"
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema"
import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema"
import { PRODUCT_OPTION_COLUMN_LENGTH } from "~/src/modules/product-option/product-option.constants"
import { product } from "~/src/modules/product/product.schema"
import { type ProductLocaleMap } from "~/src/modules/product/product.types"

export const productOption = sqliteTable(
  "product_option",
  {
    id: text("id", { length: PRODUCT_OPTION_COLUMN_LENGTH.id })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id", { length: PRODUCT_OPTION_COLUMN_LENGTH.productId })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    titles: text("titles", { mode: "json" }).$type<ProductLocaleMap>().notNull(),
    ...timestamps(),
  },
  (table) => [index("product_option_productId_idx").on(table.productId)],
)

export const productOptionRelations = relations(productOption, ({ one, many }) => ({
  optionOnVariants: many(optionOnVariant),
  product: one(product, {
    fields: [productOption.productId],
    references: [product.id],
  }),
  values: many(productOptionValue),
}))
