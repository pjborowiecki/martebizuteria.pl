import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"

export const courier = sqliteTable("courier", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  internalCode: text("internal_code").unique().notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  logo: text("logo", { length: 2048 }),
  name: text("name").notNull(),
  ...timestamps(),
})

export const courierRelations = relations(courier, ({ many }) => ({
  deliveryMethods: many(deliveryMethod),
}))
