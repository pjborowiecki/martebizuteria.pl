import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const collection = sqliteTable(
  "collection",
  {
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    handle: text("handle", { length: 255 }).notNull().unique(),
    id: text("id").primaryKey(),
    metadata: text("metadata"),
    title: text("title", { length: 255 }).notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull()
  },
  (table) => [index("collection_handle_idx").on(table.handle)]
);
