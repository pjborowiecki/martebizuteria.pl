import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { checkout } from "~/src/modules/checkout/checkout.schema";

const DEFAULT_REFUNDED_AMOUNT = 0;

export const payment = sqliteTable(
  "payment",
  {
    // Stored in cents
    amount: integer("amount").notNull(),
    checkoutId: text("checkout_id")
      .references(() => checkout.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: text("created_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    currency: text("currency", { length: 3 }).default("PLN").notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // e.g., 'stripe', 'paypal'
    provider: text("provider").notNull(),
    refundedAmount: integer("refunded_amount").default(DEFAULT_REFUNDED_AMOUNT).notNull(),
    refundedAt: text("refunded_at"),
    status: text("status", {
      enum: ["pending", "succeeded", "failed", "refunded"]
    })
      .default("pending")
      .notNull(),
    // e.g., Stripe Checkout Session ID
    transactionId: text("transaction_id"),
    updatedAt: text("updated_at")
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString())
      .notNull()
  },
  (table) => [index("payment_checkoutId_idx").on(table.checkoutId), index("payment_transactionId_idx").on(table.transactionId)]
);

export const paymentRelations = relations(payment, ({ one }) => ({
  checkout: one(checkout, {
    fields: [payment.checkoutId],
    references: [checkout.id]
  })
}));
