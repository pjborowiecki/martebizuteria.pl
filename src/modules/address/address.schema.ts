import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { user } from "~/src/modules/user/user.schema"

export const address = sqliteTable(
  "address",
  {
    address1: text("address1", { length: 512 }).notNull(),
    address2: text("address2", { length: 512 }),
    city: text("city", { length: 256 }).notNull(),
    countryCode: text("country_code", { length: 2 }).notNull(),
    firstName: text("first_name", { length: 256 }),
    id: text("id").primaryKey(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    lastName: text("last_name", { length: 256 }),
    phone: text("phone", { length: 32 }),
    postalCode: text("postal_code", { length: 32 }),
    province: text("province", { length: 256 }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (table) => [index("address_userId_idx").on(table.userId), index("address_userId_isDefault_idx").on(table.userId, table.isDefault)],
)

export const addressRelations = relations(address, ({ one }) => ({
  user: one(user, {
    fields: [address.userId],
    references: [user.id],
  }),
}))
