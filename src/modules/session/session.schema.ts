import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { user } from "~/src/modules/user/user.schema";

export const session = sqliteTable(
  "session",
  {
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    impersonatedBy: text("impersonated_by"),
    ipAddress: text("ip_address", { length: 45 }),
    token: text("token", { length: 16_384 }).notNull().unique(),
    userAgent: text("user_agent", { length: 4096 }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));
