import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const rateLimit = sqliteTable(
  "rate_limit",
  {
    count: integer("count").notNull(),
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    lastRequest: integer("last_request").notNull(),
  },
  (table) => [index("rate_limit_last_request_idx").on(table.lastRequest)],
)
