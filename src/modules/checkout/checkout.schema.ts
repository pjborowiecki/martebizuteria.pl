import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { address } from "~/src/modules/address/address.schema";
import { cart } from "~/src/modules/cart/cart.schema";
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema";
import { discount } from "~/src/modules/discount/discount.schema";
import { user } from "~/src/modules/user/user.schema";

export const checkout = sqliteTable(
  "checkout",
  {
    billingAddressId: text("billing_address_id").references(() => address.id, {
      onDelete: "set null"
    }),
    // Nullable if cart is cleared after checkout
    cartId: text("cart_id").references(() => cart.id, { onDelete: "set null" }),
    customerNote: text("customer_note"),
    deliveryMethodId: text("delivery_method_id").references(() => deliveryMethod.id, {
      onDelete: "set null"
    }),
    discountId: text("discount_id"),
    email: text("email", { length: 320 }).notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lockerId: text("locker_id"),
    shippingAddressId: text("shipping_address_id").references(() => address.id, {
      onDelete: "set null"
    }),
    status: text("status", {
      enum: ["pending", "processing", "completed", "failed", "abandoned"]
    })
      .default("pending")
      .notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps()
  },
  (table) => [
    index("checkout_cartId_idx").on(table.cartId),
    index("checkout_userId_idx").on(table.userId),
    index("checkout_status_idx").on(table.status)
  ]
);

export const checkoutRelations = relations(checkout, ({ one }) => ({
  billingAddress: one(address, {
    fields: [checkout.billingAddressId],
    references: [address.id]
  }),
  cart: one(cart, {
    fields: [checkout.cartId],
    references: [cart.id]
  }),
  deliveryMethod: one(deliveryMethod, {
    fields: [checkout.deliveryMethodId],
    references: [deliveryMethod.id]
  }),
  discount: one(discount, {
    fields: [checkout.discountId],
    references: [discount.id]
  }),
  shippingAddress: one(address, {
    fields: [checkout.shippingAddressId],
    references: [address.id]
  }),
  user: one(user, {
    fields: [checkout.userId],
    references: [user.id]
  })
}));
