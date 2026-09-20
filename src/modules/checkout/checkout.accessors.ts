import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { checkout } from "~/src/modules/checkout/checkout.schema"
import { payment } from "~/src/modules/payment/payment.schema"
export const getPaymentByTransactionId = (transactionId: string) =>
  db.query.payment.findFirst({
    columns: {
      checkoutId: true,
      id: true,
    },
    where: eq(payment.transactionId, transactionId),
  })

export const getCheckoutById = (checkoutId: string) =>
  db.query.checkout.findFirst({
    where: eq(checkout.id, checkoutId),
  })

export const getCheckoutEmailContext = (checkoutId: string) =>
  db.query.checkout.findFirst({
    columns: {
      billingAddressId: true,
      customerNote: true,
      lockerId: true,
      shippingAddressId: true,
    },
    where: eq(checkout.id, checkoutId),
    with: {
      billingAddress: true,
      deliveryMethod: true,
      shippingAddress: true,
    },
  })
