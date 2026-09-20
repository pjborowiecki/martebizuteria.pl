import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { user } from "~/src/modules/user/user.schema"

export const twoFactor = sqliteTable("two_factor", {
  backupCodes: text("backup_codes").notNull(),
  failedVerificationCount: integer("failed_verification_count").default(0).notNull(),
  id: text("id").primaryKey(),
  lockedUntil: timestamp("locked_until"),
  secret: text("secret").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  verified: integer("verified", { mode: "boolean" }).default(true),
  ...timestamps(),
})

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}))
