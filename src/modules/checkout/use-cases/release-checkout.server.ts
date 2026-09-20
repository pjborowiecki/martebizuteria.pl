import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { findPendingCheckoutByTransaction } from "~/src/modules/checkout/checkout.pending.server"
import { type ReleaseCheckoutInput, prepareReleaseCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
export const releaseCheckout = async (input: ReleaseCheckoutInput): Promise<void> => {
  const context = await findPendingCheckoutByTransaction(input.transactionId)
  if (context === undefined) {
    return
  }
  await runDrizzleBatch(prepareReleaseCheckoutBatch(context, input))
}
