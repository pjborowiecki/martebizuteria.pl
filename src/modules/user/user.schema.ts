import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { DEFAULT_ROLE, ROLES } from "~/src/constants/_constants/permissions";

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { account } from "~/src/modules/account/account.schema";
import { session } from "~/src/modules/session/session.schema";

export const user = sqliteTable("user", {
  banExpires: timestamp("ban_expires"),
  banReason: text("ban_reason"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  email: text("email", { length: 320 }).notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  id: text("id").primaryKey(),
  image: text("image", { length: 2048 }),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false),
  metadata: text("metadata"),
  name: text("name", { length: 256 }).notNull(),
  phone: text("phone", { length: 32 }),
  role: text("role", { enum: [ROLES.ADMIN, ROLES.CUSTOMER] })
    .default(DEFAULT_ROLE)
    .notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  timezone: text("timezone", { length: 64 }),
  twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(false),
  ...timestamps()
});
export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session)
}));
