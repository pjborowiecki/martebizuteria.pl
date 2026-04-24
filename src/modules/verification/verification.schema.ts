import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const verification = sqliteTable(
  "verification",
  {
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    expiresAt: text("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier", { length: 512 }).notNull(),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    value: text("value", { length: 8192 }).notNull()
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);
