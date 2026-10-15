import type StripeType from "stripe"

import { type CheckoutFulfillmentLine, parseCheckoutSessionFulfillmentLines } from "~/src/modules/checkout/checkout-metadata.zod"
import { getCheckoutLinesByTransactionId } from "~/src/modules/payment/payment.accessors"

export const readCheckoutSessionLines = async (session: StripeType.Checkout.Session): Promise<CheckoutFulfillmentLine[]> => {
  const storedLines = await getCheckoutLinesByTransactionId(session.id)

  return storedLines.length > 0 ? storedLines : parseCheckoutSessionFulfillmentLines(session)
}
