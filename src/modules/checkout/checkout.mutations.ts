import { checkoutAccessors } from "~/src/modules/checkout/checkout.accessors";
import {
  prepareCreateCheckoutBatch,
  prepareFulfillCheckoutBatch,
  prepareReleaseCheckoutBatch,
  resolvePendingCheckout,
  type FulfillCheckoutInput,
  type ReleaseCheckoutInput
} from "~/src/modules/checkout/checkout.utils";
import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";

async function findPendingCheckoutByTransaction(transactionId: string) {
  const paymentRow = await checkoutAccessors.getPaymentByTransactionId(transactionId);
  const checkoutRow = paymentRow === undefined ? undefined : await checkoutAccessors.getCheckoutById(paymentRow.checkoutId);

  return resolvePendingCheckout(paymentRow, checkoutRow, transactionId);
}

async function createCheckoutAndAddress(checkoutValues: CheckoutFormSchema, userId: string | undefined, userEmail: string) {
  const { checkoutId, statements } = prepareCreateCheckoutBatch(checkoutValues, userId, userEmail);
  await checkoutAccessors.runBatch(statements);
  return checkoutId;
}

async function fulfillCheckout(input: FulfillCheckoutInput): Promise<string | undefined> {
  const context = await findPendingCheckoutByTransaction(input.transactionId);
  if (context === undefined) {
    return undefined;
  }

  const { orderId, statements } = prepareFulfillCheckoutBatch(context, input);
  await checkoutAccessors.runBatch(statements);
  return orderId;
}

async function releaseCheckout(input: ReleaseCheckoutInput): Promise<void> {
  const context = await findPendingCheckoutByTransaction(input.transactionId);
  if (context === undefined) {
    return;
  }

  await checkoutAccessors.runBatch(prepareReleaseCheckoutBatch(context, input));
}

export const checkoutMutations = {
  createCheckoutAndAddress,
  fulfillCheckout,
  releaseCheckout
};
