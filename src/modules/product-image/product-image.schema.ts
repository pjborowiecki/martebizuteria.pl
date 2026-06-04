import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { PRODUCT_IMAGE_COLUMN_LENGTH, PRODUCT_IMAGE_DEFAULT_RANK } from "~/src/modules/product-image/product-image.constants";
import { product } from "~/src/modules/product/product.schema";

export const productImage = sqliteTable(
  "product_image",
  {
    alt: text("alt", { length: PRODUCT_IMAGE_COLUMN_LENGTH.alt }),
    id: text("id", { length: PRODUCT_IMAGE_COLUMN_LENGTH.id })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id", { length: PRODUCT_IMAGE_COLUMN_LENGTH.productId })
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull().default(PRODUCT_IMAGE_DEFAULT_RANK),
    url: text("url", { length: PRODUCT_IMAGE_COLUMN_LENGTH.url }).notNull(),
    ...timestamps()
  },
  (table) => [index("product_image_productId_rank_idx").on(table.productId, table.rank)]
);

export const productImageRelations = relations(productImage, ({ one }) => ({
  product: one(product, {
    fields: [productImage.productId],
    references: [product.id]
  })
}));
