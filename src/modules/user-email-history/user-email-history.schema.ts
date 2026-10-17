import { isNull } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamp } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { user } from "~/src/modules/user/user.schema"

export const userEmailHistory = sqliteTable(
  "user_email_history",
  {
    addedAt: timestamp("added_at").notNull(),
    email: text("email", { length: 320 }).notNull(),
    id: integer("id").primaryKey(),
    replacedAt: timestamp("replaced_at"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("user_email_history_userId_idx").on(table.userId),
    index("user_email_history_email_idx").on(table.email),
    uniqueIndex("user_email_history_current_unique").on(table.userId).where(isNull(table.replacedAt)),
  ],
)
