import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { ORDER_WITHDRAWAL_SCOPES } from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { order } from "~/src/modules/order/order.schema"

export const orderWithdrawal = sqliteTable(
  "order_withdrawal",
  {
    consumerName: text("consumer_name", { length: 256 }).notNull(),
    email: text("email", { length: 320 }).notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    items: text("items"),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    reason: text("reason"),
    scope: text("scope", { enum: ORDER_WITHDRAWAL_SCOPES }).notNull(),
    ...timestamps(),
  },
  (table) => [index("order_withdrawal_orderId_idx").on(table.orderId)],
)
