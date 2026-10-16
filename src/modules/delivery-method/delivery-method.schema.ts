import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { checkout } from "~/src/modules/checkout/checkout.schema"
import { courier } from "~/src/modules/courier/courier.schema"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { order } from "~/src/modules/order/order.schema"

export const deliveryMethod = sqliteTable(
  "delivery_method",
  {
    apiServiceCode: text("api_service_code").notNull(),
    archivedAt: timestamp("archived_at"),
    courierId: text("courier_id")
      .references(() => courier.id, { onDelete: "cascade" })
      .notNull(),
    description: text("description"),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    name: text("name").notNull(),
    names: text("names", { mode: "json" }).$type<DeliveryMethod["names"]>().notNull(),
    price: integer("price").notNull(),
    rank: integer("rank").notNull().default(0),
    type: text("type", { enum: ["locker", "courier", "in_store"] }).notNull(),
    ...timestamps(),
  },
  (table) => [index("delivery_method_courierId_idx").on(table.courierId)],
)

export const deliveryMethodRelations = relations(deliveryMethod, ({ one, many }) => ({
  checkouts: many(checkout),
  courier: one(courier, {
    fields: [deliveryMethod.courierId],
    references: [courier.id],
  }),
  orders: many(order),
}))
