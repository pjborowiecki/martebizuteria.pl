import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { prepareCreateCheckoutBatch } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

export const createCheckout = async (input: CreateCheckoutInput): Promise<CreatedCheckout> => {
  const { checkoutId, statements } = prepareCreateCheckoutBatch(input)
  const [first, ...rest] = statements
  const results = await db.batch([first, ...rest])
  const discountedCheckout: unknown = results.at(-1)

  return {
    checkoutId,
    discountClaimed: input.discountId !== undefined && Array.isArray(discountedCheckout) && discountedCheckout.length > 0,
  }
}

export interface CreateCheckoutInput {
  readonly checkoutValues: CheckoutFormSchema
  readonly clientAddress: string
  readonly discountId?: string | undefined
  readonly lockerPoint?: string | undefined
  readonly lockerUnconfirmed?: boolean | undefined
  readonly userEmail: string
  readonly userId: string | undefined
}

export interface CreatedCheckout {
  readonly checkoutId: string
  readonly discountClaimed: boolean
}
