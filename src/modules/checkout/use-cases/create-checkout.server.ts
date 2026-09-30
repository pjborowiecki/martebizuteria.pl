import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { prepareCreateCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

export const createCheckout = async ({ checkoutValues, discountId, userEmail, userId }: CreateCheckoutInput) => {
  const { checkoutId, statements } = prepareCreateCheckoutBatch({ checkoutValues, discountId, userEmail, userId })
  await runDrizzleBatch(statements)

  return checkoutId
}

export interface CreateCheckoutInput {
  readonly checkoutValues: CheckoutFormSchema
  readonly discountId?: string | undefined
  readonly userEmail: string
  readonly userId: string | undefined
}
