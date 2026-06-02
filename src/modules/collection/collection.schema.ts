import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import {
  COLLECTION_COLUMN_LENGTH,
  COLLECTION_DEFAULT_RANK,
  COLLECTION_STATUSES,
  DEFAULT_COLLECTION_STATUS
} from "~/src/modules/collection/collection.constants";

export const collection = sqliteTable(
  "collection",
  {
    description: text("description", { length: COLLECTION_COLUMN_LENGTH.description }),
    handle: text("handle", { length: COLLECTION_COLUMN_LENGTH.handle }).notNull().unique(),
    id: text("id").primaryKey(),
    image: text("image", { length: COLLECTION_COLUMN_LENGTH.image }),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, never> | null>(),
    rank: integer("rank").notNull().default(COLLECTION_DEFAULT_RANK),
    status: text("status", { enum: COLLECTION_STATUSES }).notNull().default(DEFAULT_COLLECTION_STATUS),
    title: text("title", { length: COLLECTION_COLUMN_LENGTH.title }).notNull(),
    ...timestamps()
  },
  (table) => [index("collection_handle_idx").on(table.handle), index("collection_rank_idx").on(table.rank)]
);
