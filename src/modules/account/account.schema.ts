import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { user } from "~/src/modules/user/user.schema";

export const account = sqliteTable(
  "account",
  {
    accessToken: text("access_token", { length: 16_384 }),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id", { length: 1024 }).notNull(),
    id: text("id").primaryKey(),
    idToken: text("id_token", { length: 16_384 }),
    password: text("password", { length: 512 }),
    providerId: text("provider_id", { length: 128 }).notNull(),
    refreshToken: text("refresh_token", { length: 16_384 }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope", { length: 8192 }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));
