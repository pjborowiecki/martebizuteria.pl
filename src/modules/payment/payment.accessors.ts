import { and, eq, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type CheckoutFulfillmentLine } from "~/src/modules/checkout/checkout-metadata.zod"
import { checkout } from "~/src/modules/checkout/checkout.schema"
import { type ReleaseLine } from "~/src/modules/checkout/checkout.utils"
import { payment } from "~/src/modules/payment/payment.schema"

export const createPendingPayment = async (data: CreatePaymentInput) => {
  await db.insert(payment).values({
    amount: data.amount,
    checkoutId: data.checkoutId,
    currency: data.currency,
    lines: data.lines,
    provider: data.provider,
    reservedLines: data.reservedLines,
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

export const getCheckoutLinesByTransactionId = async (transactionId: string): Promise<CheckoutFulfillmentLine[]> => {
  const rows = await db.select({ lines: payment.lines }).from(payment).where(eq(payment.transactionId, transactionId))

  return rows.flatMap((row) => row.lines)
}

export const getHeldLinesByTransactionId = async (transactionId: string): Promise<ReleaseLine[]> => {
  const rows = await db
    .select({ reservedLines: payment.reservedLines })
    .from(payment)
    .innerJoin(checkout, eq(checkout.id, payment.checkoutId))
    .where(and(eq(payment.transactionId, transactionId), eq(payment.status, "pending"), eq(checkout.status, "pending")))

  return rows.flatMap((row) => row.reservedLines)
}

const openCheckoutHoldingAnyOf = (variantIds: readonly string[]) =>
  and(
    eq(payment.status, "pending"),
    eq(checkout.status, "pending"),
    sql`exists (select 1 from json_each(${payment.reservedLines}) as reserved_line where json_extract(reserved_line.value, '$.variantId') in (select value from json_each(${JSON.stringify(variantIds)})))`,
  )

export const isAnyVariantHeldByOpenCheckout = async (variantIds: readonly string[]): Promise<boolean> => {
  const rows = await db
    .select({ id: payment.id })
    .from(payment)
    .innerJoin(checkout, eq(checkout.id, payment.checkoutId))
    .where(openCheckoutHoldingAnyOf(variantIds))
    .limit(1)

  return rows.length > 0
}

export const getOpenCheckoutSessionIdsHoldingVariants = async (variantIds: readonly string[]): Promise<string[]> => {
  const rows = await db
    .select({ transactionId: payment.transactionId })
    .from(payment)
    .innerJoin(checkout, eq(checkout.id, payment.checkoutId))
    .where(openCheckoutHoldingAnyOf(variantIds))

  return rows.flatMap(({ transactionId }) => (transactionId === null ? [] : [transactionId]))
}

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
      createdAt: true,
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
    checkoutCreatedAt: checkoutRow.createdAt,
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
  lines: readonly CheckoutFulfillmentLine[]
  provider: "stripe"
  reservedLines: readonly ReleaseLine[]
  transactionId: string
}

interface PaymentContext {
  checkoutCreatedAt: Date
  checkoutId: string
  checkoutStatus: (typeof checkout.$inferSelect)["status"]
  email: string
  paymentStatus: (typeof payment.$inferSelect)["status"]
  userId: string | undefined
}
