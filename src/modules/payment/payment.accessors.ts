import { eq } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { checkout } from "~/src/modules/checkout/checkout.schema";
import { payment } from "~/src/modules/payment/payment.schema";

interface CreatePaymentInput {
  amount: number;
  checkoutId: string;
  currency: string;
  provider: "stripe";
  transactionId: string;
}

interface PaymentContext {
  checkoutId: string;
  email: string;
  userId: string | undefined;
}

interface RepointPaymentInput {
  amount: number;
  newTransactionId: string;
  oldTransactionId: string;
}

// NOTE: intentionally NOT a prepared statement. The `payment.id` default is a
// `$defaultFn(() => crypto.randomUUID())`, which Drizzle evaluates ONCE when a
// statement is prepared — so a prepared insert reuses the same id on every call
// and the second payment fails the primary-key constraint. Building the insert
// per call lets the default generate a fresh id each time.
async function createPendingPayment(data: CreatePaymentInput) {
  await db.insert(payment).values({
    amount: data.amount,
    checkoutId: data.checkoutId,
    currency: data.currency,
    provider: data.provider,
    status: "pending",
    transactionId: data.transactionId
  });
}

/**
 * Resolves the checkout context (id, email, owner) behind a payment, looked up
 * by its Stripe transaction id. Used when recreating a Checkout Session so the
 * new session reuses the same checkout record and customer details.
 */
async function getPaymentContextByTransactionId(transactionId: string): Promise<PaymentContext | undefined> {
  const paymentRow = await db.query.payment.findFirst({
    columns: { checkoutId: true },
    where: eq(payment.transactionId, transactionId)
  });

  if (paymentRow === undefined) {
    return undefined;
  }

  const checkoutRow = await db.query.checkout.findFirst({
    columns: { email: true, userId: true },
    where: eq(checkout.id, paymentRow.checkoutId)
  });

  if (checkoutRow === undefined) {
    return undefined;
  }

  return { checkoutId: paymentRow.checkoutId, email: checkoutRow.email, userId: checkoutRow.userId ?? undefined };
}

/**
 * Moves a pending payment from a stale Checkout Session to a freshly created one
 * (e.g. after the total changed) and updates its amount. Keeps exactly one
 * payment row per checkout so the webhook only ever matches the live session.
 */
async function repointPayment(data: RepointPaymentInput) {
  await db
    .update(payment)
    .set({ amount: data.amount, transactionId: data.newTransactionId })
    .where(eq(payment.transactionId, data.oldTransactionId));
}

export const paymentAccessors = {
  createPendingPayment,
  getPaymentContextByTransactionId,
  repointPayment
};
