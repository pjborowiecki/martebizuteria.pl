import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

export const collection = sqliteTable(
  "collection",
  {
    handle: text("handle", { length: 255 }).notNull().unique(),
    id: text("id").primaryKey(),
    image: text("image", { length: 2048 }),
    metadata: text("metadata"),
    seoDescription: text("seo_description"),
    seoTitle: text("seo_title"),
    title: text("title", { length: 255 }).notNull(),
    ...timestamps()
  },
  (table) => [index("collection_handle_idx").on(table.handle)]
);
