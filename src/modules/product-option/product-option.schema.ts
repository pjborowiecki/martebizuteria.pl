import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema";
import { product } from "~/src/modules/product/product.schema";

export const productOption = sqliteTable(
  "product_option",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    ...timestamps()
  },
  (table) => [index("product_option_productId_idx").on(table.productId)]
);

export const productOptionRelations = relations(productOption, ({ one, many }) => ({
  product: one(product, {
    fields: [productOption.productId],
    references: [product.id]
  }),
  values: many(productOptionValue)
}));
