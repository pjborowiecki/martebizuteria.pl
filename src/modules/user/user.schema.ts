import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { account } from "~/src/modules/account/account.schema";
import { session } from "~/src/modules/session/session.schema";

export const user = sqliteTable("user", {
  createdAt: text("created_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  email: text("email", { length: 320 }).notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  id: text("id").primaryKey(),
  image: text("image", { length: 2048 }),
  metadata: text("metadata"),
  name: text("name", { length: 256 }).notNull(),
  phone: text("phone", { length: 32 }),
  updatedAt: text("updated_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString())
    .notNull()
});
export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session)
}));
