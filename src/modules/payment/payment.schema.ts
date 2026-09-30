import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { checkout } from "~/src/modules/checkout/checkout.schema"

export const payment = sqliteTable(
  "payment",
  {
    amount: integer("amount").notNull(),
    checkoutId: text("checkout_id")
      .references(() => checkout.id, { onDelete: "cascade" })
      .notNull(),
    currency: text("currency", { length: 3 }).default("PLN").notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: text("provider").notNull(),
    refundedAmount: integer("refunded_amount").default(0).notNull(),
    refundedAt: timestamp("refunded_at"),
    status: text("status", {
      enum: ["pending", "succeeded", "failed", "refunded"],
    })
      .default("pending")
      .notNull(),
    transactionId: text("transaction_id"),
    ...timestamps(),
  },
  (table) => [index("payment_checkoutId_idx").on(table.checkoutId), uniqueIndex("payment_transactionId_unique").on(table.transactionId)],
)

export const paymentRelations = relations(payment, ({ one }) => ({
  checkout: one(checkout, {
    fields: [payment.checkoutId],
    references: [checkout.id],
  }),
}))
