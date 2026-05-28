import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const DEFAULT_POSITION = 0;

export const category = sqliteTable(
  "category",
  {
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    description: text("description"),
    handle: text("handle", { length: 255 }).notNull().unique(),
    id: text("id").primaryKey(),
    image: text("image", { length: 2048 }),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    metadata: text("metadata"),
    name: text("name", { length: 255 }).notNull(),
    parentId: text("parent_id"),
    position: integer("position").default(DEFAULT_POSITION).notNull(),
    seoDescription: text("seo_description"),
    seoTitle: text("seo_title"),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull()
  },
  (table) => [index("category_handle_idx").on(table.handle), index("category_parentId_idx").on(table.parentId)]
);

export const categoryRelations = relations(category, ({ one, many }) => ({
  children: many(category, { relationName: "category_parent" }),
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: "category_parent"
  })
}));
