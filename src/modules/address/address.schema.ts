import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "~/src/modules/user/user.schema";

export const address = sqliteTable(
  "address",
  {
    address1: text("address1", { length: 512 }).notNull(),
    address2: text("address2", { length: 512 }),
    city: text("city", { length: 256 }).notNull(),
    countryCode: text("country_code", { length: 2 }).notNull(),
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    firstName: text("first_name", { length: 256 }),
    id: text("id").primaryKey(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    lastName: text("last_name", { length: 256 }),
    phone: text("phone", { length: 32 }),
    postalCode: text("postal_code", { length: 32 }),
    province: text("province", { length: 256 }),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [index("address_userId_idx").on(table.userId)]
);

export const addressRelations = relations(address, ({ one }) => ({
  user: one(user, {
    fields: [address.userId],
    references: [user.id]
  })
}));
