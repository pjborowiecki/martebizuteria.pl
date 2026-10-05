import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { checkout } from "~/src/modules/checkout/checkout.schema"
import { payment } from "~/src/modules/payment/payment.schema"

export const createPendingPayment = async (data: CreatePaymentInput) => {
  await db.insert(payment).values({
    amount: data.amount,
    checkoutId: data.checkoutId,
    currency: data.currency,
    provider: data.provider,
    status: "pending",
    transactionId: data.transactionId,
  })
}

export const getPaymentByTransactionId = (transactionId: string) =>
  db.query.payment.findFirst({
    columns: {
      checkoutId: true,
      id: true,
      refundedAmount: true,
      status: true,
    },
    where: eq(payment.transactionId, transactionId),
  })

export const getPaymentContextByTransactionId = async (transactionId: string): Promise<PaymentContext | undefined> => {
  const paymentRow = await db.query.payment.findFirst({
    columns: {
      checkoutId: true,
      status: true,
    },
    where: eq(payment.transactionId, transactionId),
  })

  if (paymentRow === undefined) {
    return undefined
  }

  const checkoutRow = await db.query.checkout.findFirst({
    columns: {
      email: true,
      status: true,
      userId: true,
    },
    where: eq(checkout.id, paymentRow.checkoutId),
  })

  if (checkoutRow === undefined) {
    return undefined
  }

  return {
    checkoutId: paymentRow.checkoutId,
    checkoutStatus: checkoutRow.status,
    email: checkoutRow.email,
    paymentStatus: paymentRow.status,
    userId: checkoutRow.userId ?? undefined,
  }
}

interface CreatePaymentInput {
  amount: number
  checkoutId: string
  currency: string
  provider: "stripe"
  transactionId: string
}

interface PaymentContext {
  checkoutId: string
  checkoutStatus: (typeof checkout.$inferSelect)["status"]
  email: string
  paymentStatus: (typeof payment.$inferSelect)["status"]
  userId: string | undefined
}
