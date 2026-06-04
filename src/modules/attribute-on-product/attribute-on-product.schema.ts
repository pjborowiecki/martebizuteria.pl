import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import {
  ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH,
  ATTRIBUTE_ON_PRODUCT_DEFAULT_RANK
} from "~/src/modules/attribute-on-product/attribute-on-product.constants";
import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema";
import { product } from "~/src/modules/product/product.schema";

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
    ...timestamps()
  },
  (table) => [
    index("attribute_on_product_productId_idx").on(table.productId),
    uniqueIndex("attribute_on_product_product_attribute_uidx").on(table.productId, table.attributeId)
  ]
);

export const attributeOnProductRelations = relations(attributeOnProduct, ({ one }) => ({
  product: one(product, {
    fields: [attributeOnProduct.productId],
    references: [product.id]
  }),
  productAttribute: one(productAttribute, {
    fields: [attributeOnProduct.attributeId],
    references: [productAttribute.id]
  })
}));
