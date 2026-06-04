import { relations } from "drizzle-orm";
import { type AnySQLiteColumn, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema";
import {
  CATEGORY_DEFAULT_RANK,
  CATEGORY_STATUSES,
  DEFAULT_CATEGORY_STATUS
} from "~/src/modules/product-category/product-category.constants";
import type { CategoryLocaleMap } from "~/src/modules/product-category/product-category.types";

export const productCategory = sqliteTable(
  "product_category",
  {
    descriptions: text("descriptions", { mode: "json" }).$type<CategoryLocaleMap | null>(),
    handle: text("handle", { length: 255 }).notNull().unique(),
    id: text("id", { length: 36 }).primaryKey(),
    image: text("image", { length: 2048 }),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, never> | null>(),
    parentId: text("parent_id", { length: 36 }).references((): AnySQLiteColumn => productCategory.id, {
      onDelete: "set null"
    }),
    rank: integer("rank").notNull().default(CATEGORY_DEFAULT_RANK),
    shortDescriptions: text("short_descriptions", { mode: "json" }).$type<CategoryLocaleMap | null>(),
    status: text("status", { enum: CATEGORY_STATUSES }).notNull().default(DEFAULT_CATEGORY_STATUS),
    subtitles: text("subtitles", { mode: "json" }).$type<CategoryLocaleMap | null>(),
    titles: text("titles", { mode: "json" }).$type<CategoryLocaleMap>().notNull(),
    ...timestamps()
  },
  (table) => [
    index("product_category_parent_rank_idx").on(table.parentId, table.rank),
    index("product_category_status_parent_rank_idx").on(table.status, table.parentId, table.rank)
  ]
);

export const productCategoryRelations = relations(productCategory, ({ one, many }) => ({
  categoryOnProducts: many(categoryOnProduct),
  children: many(productCategory, { relationName: "product_category_parent" }),
  parent: one(productCategory, {
    fields: [productCategory.parentId],
    references: [productCategory.id],
    relationName: "product_category_parent"
  })
}));
