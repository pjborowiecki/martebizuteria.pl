import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

export const verification = sqliteTable(
  "verification",
  {
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier", { length: 512 }).notNull(),
    value: text("value", { length: 8192 }).notNull(),
    ...timestamps(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
)
