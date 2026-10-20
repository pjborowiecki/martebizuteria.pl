import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { ADDRESS_COLUMN_LENGTH } from "~/src/modules/address/address.constants"
import { user } from "~/src/modules/user/user.schema"

export const address = sqliteTable(
  "address",
  {
    address1: text("address1", { length: ADDRESS_COLUMN_LENGTH.address1 }).notNull(),
    address2: text("address2", { length: ADDRESS_COLUMN_LENGTH.address2 }),
    city: text("city", { length: ADDRESS_COLUMN_LENGTH.city }).notNull(),
    countryCode: text("country_code", { length: 2 }).notNull(),
    firstName: text("first_name", { length: ADDRESS_COLUMN_LENGTH.firstName }),
    id: text("id").primaryKey(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    lastName: text("last_name", { length: ADDRESS_COLUMN_LENGTH.lastName }),
    phone: text("phone", { length: ADDRESS_COLUMN_LENGTH.phone }),
    postalCode: text("postal_code", { length: ADDRESS_COLUMN_LENGTH.postalCode }),
    province: text("province", { length: ADDRESS_COLUMN_LENGTH.province }),
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
