import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { prepareReleaseCheckoutBatch } from "~/src/modules/checkout/checkout.accessors"
import { type ReleaseCheckoutInput } from "~/src/modules/checkout/checkout.types"

export const releaseCheckout = async (input: ReleaseCheckoutInput): Promise<boolean> => {
  const [first, ...rest] = prepareReleaseCheckoutBatch(input)
  const results = await db.batch([first, ...rest])
  const failedPayments: unknown = results.at(-1)

  return Array.isArray(failedPayments) && failedPayments.length > 0
}
