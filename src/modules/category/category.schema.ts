import { relations } from "drizzle-orm";
import { type AnySQLiteColumn, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import {
  CATEGORY_COLUMN_LENGTH,
  CATEGORY_DEFAULT_RANK,
  CATEGORY_STATUSES,
  DEFAULT_CATEGORY_STATUS
} from "~/src/modules/category/category.constants";

export const category = sqliteTable(
  "category",
  {
    description: text("description", { length: CATEGORY_COLUMN_LENGTH.description }),
    handle: text("handle", { length: CATEGORY_COLUMN_LENGTH.handle }).notNull().unique(),
    id: text("id", { length: CATEGORY_COLUMN_LENGTH.id }).primaryKey(),
    image: text("image", { length: CATEGORY_COLUMN_LENGTH.image }),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, never> | null>(),
    parentId: text("parent_id", { length: CATEGORY_COLUMN_LENGTH.parentId }).references((): AnySQLiteColumn => category.id, {
      onDelete: "set null"
    }),
    rank: integer("rank").notNull().default(CATEGORY_DEFAULT_RANK),
    shortDescription: text("short_description", {
      length: CATEGORY_COLUMN_LENGTH.shortDescription
    }),
    status: text("status", { enum: CATEGORY_STATUSES }).notNull().default(DEFAULT_CATEGORY_STATUS),
    subtitle: text("subtitle", { length: CATEGORY_COLUMN_LENGTH.subtitle }),
    title: text("title", { length: CATEGORY_COLUMN_LENGTH.title }).notNull(),
    ...timestamps()
  },
  (table) => [
    index("category_parent_rank_idx").on(table.parentId, table.rank),
    index("category_status_parent_rank_idx").on(table.status, table.parentId, table.rank)
  ]
);

export const categoryRelations = relations(category, ({ one, many }) => ({
  children: many(category, { relationName: "category_parent" }),
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: "category_parent"
  })
}));
