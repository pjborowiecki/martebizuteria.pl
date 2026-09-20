import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema"
import {
  PRODUCT_OPTION_VALUE_COLUMN_LENGTH,
  PRODUCT_OPTION_VALUE_DEFAULT_RANK,
} from "~/src/modules/product-option-value/product-option-value.constants"
import { productOption } from "~/src/modules/product-option/product-option.schema"
import { type ProductLocaleMap } from "~/src/modules/product/product.types"

export const productOptionValue = sqliteTable(
  "product_option_value",
  {
    id: text("id", { length: PRODUCT_OPTION_VALUE_COLUMN_LENGTH.id })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    labels: text("labels", { mode: "json" }).$type<ProductLocaleMap>().notNull(),
    optionId: text("option_id", { length: PRODUCT_OPTION_VALUE_COLUMN_LENGTH.optionId })
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull().default(PRODUCT_OPTION_VALUE_DEFAULT_RANK),
    ...timestamps(),
  },
  (table) => [index("product_option_value_optionId_idx").on(table.optionId)],
)

export const productOptionValueRelations = relations(productOptionValue, ({ one, many }) => ({
  option: one(productOption, {
    fields: [productOptionValue.optionId],
    references: [productOption.id],
  }),
  optionOnVariants: many(optionOnVariant),
}))
