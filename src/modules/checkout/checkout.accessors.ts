import { eq } from "drizzle-orm";

import { runDrizzleBatch, type DrizzleBatchStatement } from "~/src/integrations/drizzle-orm/drizzle.batch";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { checkout } from "~/src/modules/checkout/checkout.schema";
import { payment } from "~/src/modules/payment/payment.schema";

async function runBatch(statements: readonly DrizzleBatchStatement[]): Promise<void> {
  await runDrizzleBatch(statements);
}

function getPaymentByTransactionId(transactionId: string) {
  return db.query.payment.findFirst({
    columns: { checkoutId: true, id: true },
    where: eq(payment.transactionId, transactionId)
  });
}

function getCheckoutById(checkoutId: string) {
  return db.query.checkout.findFirst({
    where: eq(checkout.id, checkoutId)
  });
}

export const checkoutAccessors = {
  getCheckoutById,
  getPaymentByTransactionId,
  runBatch
};
