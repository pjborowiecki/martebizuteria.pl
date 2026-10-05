import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type ReleaseCheckoutInput, prepareReleaseCheckoutBatch } from "~/src/modules/checkout/checkout.utils"

export const releaseCheckout = async (input: ReleaseCheckoutInput): Promise<boolean> => {
  const [first, ...rest] = prepareReleaseCheckoutBatch(input)
  const results = await db.batch([first, ...rest])
  const failedPayments: unknown = results.at(-1)

  return Array.isArray(failedPayments) && failedPayments.length > 0
}
