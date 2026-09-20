import { relations } from "drizzle-orm"
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { OPTION_ON_VARIANT_COLUMN_LENGTH } from "~/src/modules/option-on-variant/option-on-variant.constants"
import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema"
import { productOption } from "~/src/modules/product-option/product-option.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"

export const optionOnVariant = sqliteTable(
  "option_on_variant",
  {
    id: text("id", { length: OPTION_ON_VARIANT_COLUMN_LENGTH.id })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    optionId: text("option_id", { length: OPTION_ON_VARIANT_COLUMN_LENGTH.optionId })
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    valueId: text("value_id", { length: OPTION_ON_VARIANT_COLUMN_LENGTH.valueId })
      .notNull()
      .references(() => productOptionValue.id, { onDelete: "cascade" }),
    variantId: text("variant_id", { length: OPTION_ON_VARIANT_COLUMN_LENGTH.variantId })
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (table) => [
    index("option_on_variant_optionId_idx").on(table.optionId),
    index("option_on_variant_valueId_idx").on(table.valueId),
    index("option_on_variant_variantId_idx").on(table.variantId),
    uniqueIndex("option_on_variant_variant_option_unique").on(table.variantId, table.optionId),
  ],
)

export const optionOnVariantRelations = relations(optionOnVariant, ({ one }) => ({
  option: one(productOption, {
    fields: [optionOnVariant.optionId],
    references: [productOption.id],
  }),
  value: one(productOptionValue, {
    fields: [optionOnVariant.valueId],
    references: [productOptionValue.id],
  }),
  variant: one(productVariant, {
    fields: [optionOnVariant.variantId],
    references: [productVariant.id],
  }),
}))
