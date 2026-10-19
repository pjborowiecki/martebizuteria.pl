import type StripeType from "stripe"

import { parseCheckoutSessionFulfillmentLines } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFulfillmentLine } from "~/src/modules/checkout/checkout.zod"
import { getCheckoutLinesByTransactionId } from "~/src/modules/payment/payment.accessors"

export const readCheckoutSessionLines = async (session: StripeType.Checkout.Session): Promise<CheckoutFulfillmentLine[]> => {
  const storedLines = await getCheckoutLinesByTransactionId(session.id)

  return storedLines.length > 0 ? storedLines : parseCheckoutSessionFulfillmentLines(session)
}
