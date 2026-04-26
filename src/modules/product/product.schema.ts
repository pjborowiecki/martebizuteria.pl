import { relations, sql } from "drizzle-orm";
import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { category } from "~/src/modules/category/category.schema";
import { collection } from "~/src/modules/collection/collection.schema";

export const product = sqliteTable(
  "product",
  {
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    collectionId: text("collection_id").references(() => collection.id, {
      onDelete: "set null"
    }),
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    description: text("description"),
    handle: text("handle", { length: 255 }).notNull().unique(),
    id: text("id").primaryKey(),
    images: text("images"),
    metadata: text("metadata"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .default("draft")
      .notNull(),
    subtitle: text("subtitle", { length: 512 }),
    thumbnail: text("thumbnail", { length: 2048 }),
    title: text("title", { length: 512 }).notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    weight: real("weight")
  },
  (table) => [
    index("product_handle_idx").on(table.handle),
    index("product_status_idx").on(table.status),
    index("product_categoryId_idx").on(table.categoryId),
    index("product_collectionId_idx").on(table.collectionId)
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const productRelations = relations(product, ({ one }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id]
  }),
  collection: one(collection, {
    fields: [product.collectionId],
    references: [collection.id]
  })
}));
