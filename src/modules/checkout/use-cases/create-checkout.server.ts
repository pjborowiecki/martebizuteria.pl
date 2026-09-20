import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { prepareCreateCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
export const createCheckoutAndAddress = async (checkoutValues: CheckoutFormSchema, userId: string | undefined, userEmail: string) => {
  const { checkoutId, statements } = prepareCreateCheckoutBatch(checkoutValues, userId, userEmail)
  await runDrizzleBatch(statements)
  return checkoutId
}
