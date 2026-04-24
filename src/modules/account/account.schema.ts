import { relations, sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "~/src/modules/user/user.schema";

export const account = sqliteTable(
  "account",
  {
    accessToken: text("access_token", { length: 16_384 }),
    accessTokenExpiresAt: text("access_token_expires_at"),
    accountId: text("account_id", { length: 1024 }).notNull(),
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    id: text("id").primaryKey(),
    idToken: text("id_token", { length: 16_384 }),
    password: text("password", { length: 512 }),
    providerId: text("provider_id", { length: 128 }).notNull(),
    refreshToken: text("refresh_token", { length: 16_384 }),
    refreshTokenExpiresAt: text("refresh_token_expires_at"),
    scope: text("scope", { length: 8192 }),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));
