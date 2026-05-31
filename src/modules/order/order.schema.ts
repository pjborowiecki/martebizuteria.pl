import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamp, timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { checkout } from "~/src/modules/checkout/checkout.schema";
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema";
import { discount } from "~/src/modules/discount/discount.schema";
import { payment } from "~/src/modules/payment/payment.schema";
import { user } from "~/src/modules/user/user.schema";

const DEFAULT_MONETARY_VALUE = 0;

export const order = sqliteTable(
  "order",
  {
    canceledAt: timestamp("canceled_at"),
    checkoutId: text("checkout_id").references(() => checkout.id, { onDelete: "set null" }),
    currencyCode: text("currency_code", { length: 3 }).default("PLN").notNull(),
    customerNote: text("customer_note"),
    deliveredAt: timestamp("delivered_at"),
    deliveryMethodId: text("delivery_method_id").references(() => deliveryMethod.id, { onDelete: "set null" }),
    discountId: text("discount_id"),
    discountTotal: integer("discount_total").default(DEFAULT_MONETARY_VALUE).notNull(),
    email: text("email", { length: 320 }).notNull(),
    fulfillmentStatus: text("fulfillment_status", {
      enum: ["not_fulfilled", "partially_fulfilled", "fulfilled", "shipped", "delivered", "cancelled"]
    })
      .default("not_fulfilled")
      .notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lockerId: text("locker_id"),
    metadata: text("metadata"),
    paymentId: text("payment_id").references(() => payment.id, { onDelete: "set null" }),
    shippedAt: timestamp("shipped_at"),
    shippingTotal: integer("shipping_total").default(DEFAULT_MONETARY_VALUE).notNull(),
    status: text("status", {
      enum: ["pending", "processing", "completed", "cancelled", "refunded"]
    })
      .default("pending")
      .notNull(),
    subtotal: integer("subtotal").default(DEFAULT_MONETARY_VALUE).notNull(),
    taxTotal: integer("tax_total").default(DEFAULT_MONETARY_VALUE).notNull(),
    total: integer("total").default(DEFAULT_MONETARY_VALUE).notNull(),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url", { length: 2048 }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps()
  },
  (table) => [
    index("order_userId_idx").on(table.userId),
    index("order_status_idx").on(table.status),
    index("order_createdAt_idx").on(table.createdAt)
  ]
);

export const orderRelations = relations(order, ({ one }) => ({
  checkout: one(checkout, {
    fields: [order.checkoutId],
    references: [checkout.id]
  }),
  deliveryMethod: one(deliveryMethod, {
    fields: [order.deliveryMethodId],
    references: [deliveryMethod.id]
  }),
  discount: one(discount, {
    fields: [order.discountId],
    references: [discount.id]
  }),
  payment: one(payment, {
    fields: [order.paymentId],
    references: [payment.id]
  }),
  user: one(user, {
    fields: [order.userId],
    references: [user.id]
  })
}));
