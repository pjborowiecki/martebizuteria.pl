import { relations } from "drizzle-orm";
import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { category } from "~/src/modules/category/category.schema";
import { collection } from "~/src/modules/collection/collection.schema";
import { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import { DEFAULT_PRODUCT_STATUS, PRODUCT_STATUSES } from "~/src/modules/product/product.constants";

export const product = sqliteTable(
  "product",
  {
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    collectionId: text("collection_id").references(() => collection.id, {
      onDelete: "set null"
    }),
    description: text("description"),
    handle: text("handle", { length: 255 }).notNull().unique(),
    id: text("id").primaryKey(),
    images: text("images", { mode: "json" }).$type<string[]>(),
    metadata: text("metadata"),
    seoDescription: text("seo_description"),
    seoTitle: text("seo_title"),
    status: text("status", { enum: PRODUCT_STATUSES }).default(DEFAULT_PRODUCT_STATUS).notNull(),
    subtitle: text("subtitle", { length: 512 }),
    tags: text("tags", { mode: "json" }).$type<string[]>(),
    thumbnail: text("thumbnail", { length: 2048 }),
    title: text("title", { length: 512 }).notNull(),
    weight: real("weight"),
    ...timestamps()
  },
  (table) => [
    index("product_status_createdAt_idx").on(table.status, table.createdAt),
    index("product_category_status_idx").on(table.categoryId, table.status),
    index("product_collection_status_idx").on(table.collectionId, table.status)
  ]
);

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id]
  }),
  collection: one(collection, {
    fields: [product.collectionId],
    references: [collection.id]
  }),
  variants: many(productVariant)
}));

export const collectionRelations = relations(collection, ({ many }) => ({
  products: many(product)
}));
