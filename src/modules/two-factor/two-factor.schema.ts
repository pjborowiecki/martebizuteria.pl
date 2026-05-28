import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "~/src/modules/user/user.schema";

export const twoFactor = sqliteTable("two_factor", {
  backupCodes: text("backup_codes").notNull(),
  createdAt: text("created_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  updatedAt: text("updated_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString())
    .notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  verified: integer("verified", { mode: "boolean" }).default(true)
});

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id]
  })
}));
