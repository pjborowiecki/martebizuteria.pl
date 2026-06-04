import { relations } from "drizzle-orm";
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema";
import { PRODUCT_OPTION_COLUMN_LENGTH } from "~/src/modules/product-option/product-option.constants";
import { product } from "~/src/modules/product/product.schema";

export const productOption = sqliteTable(
  "product_option",
  {
    id: text("id", { length: PRODUCT_OPTION_COLUMN_LENGTH.id })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id", { length: PRODUCT_OPTION_COLUMN_LENGTH.productId })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    title: text("title", { length: PRODUCT_OPTION_COLUMN_LENGTH.title }).notNull(),
    ...timestamps()
  },
  (table) => [
    index("product_option_productId_idx").on(table.productId),
    uniqueIndex("product_option_product_title_unique").on(table.productId, table.title)
  ]
);

export const productOptionRelations = relations(productOption, ({ one, many }) => ({
  optionOnVariants: many(optionOnVariant),
  product: one(product, {
    fields: [productOption.productId],
    references: [product.id]
  })
}));
