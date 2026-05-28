import { relations, sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema";
import { product } from "~/src/modules/product/product.schema";

export const productOption = sqliteTable(
  "product_option",
  {
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull()
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
