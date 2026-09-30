import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { getCheckoutById } from "~/src/modules/checkout/checkout.accessors"
import { findPendingCheckoutByTransaction } from "~/src/modules/checkout/checkout.pending.server"
import { type FulfillCheckoutInput, prepareFulfillCheckoutBatch } from "~/src/modules/checkout/checkout.utils"

export const fulfillCheckout = async (input: FulfillCheckoutInput): Promise<string | undefined> => {
  const context = await findPendingCheckoutByTransaction(input.transactionId)
  if (context === undefined) {
    return undefined
  }

  const checkoutRow = await getCheckoutById(context.checkoutId)
  const { orderId, statements } = prepareFulfillCheckoutBatch(context, input, {
    customerNote: checkoutRow?.customerNote,
    deliveryMethodId: checkoutRow?.deliveryMethodId,
    lockerId: checkoutRow?.lockerId,
  })
  await runDrizzleBatch(statements)

  return orderId
}
