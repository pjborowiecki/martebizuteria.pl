import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { type ReleaseCheckoutInput, prepareReleaseCheckoutBatch } from "~/src/modules/checkout/checkout.utils"

export const releaseCheckout = (input: ReleaseCheckoutInput): Promise<void> => runDrizzleBatch(prepareReleaseCheckoutBatch(input))
