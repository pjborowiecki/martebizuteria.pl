import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema";

export const courier = sqliteTable("courier", {
  createdAt: text("created_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  internalCode: text("internal_code").unique().notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  logo: text("logo", { length: 2048 }),
  name: text("name").notNull(),
  updatedAt: text("updated_at")
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString())
    .notNull()
});

export const courierRelations = relations(courier, ({ many }) => ({
  deliveryMethods: many(deliveryMethod)
}));
