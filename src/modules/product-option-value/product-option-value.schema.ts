import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { productOption } from "~/src/modules/product-option/product-option.schema";
import { productVariant } from "~/src/modules/product-variant/product-variant.schema";

export const productOptionValue = sqliteTable(
  "product_option_value",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    optionId: text("option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("product_option_value_optionId_idx").on(table.optionId),
    index("product_option_value_variantId_idx").on(table.variantId)
  ]
);

export const productOptionValueRelations = relations(productOptionValue, ({ one }) => ({
  option: one(productOption, {
    fields: [productOptionValue.optionId],
    references: [productOption.id]
  }),
  variant: one(productVariant, {
    fields: [productOptionValue.variantId],
    references: [productVariant.id]
  })
}));
