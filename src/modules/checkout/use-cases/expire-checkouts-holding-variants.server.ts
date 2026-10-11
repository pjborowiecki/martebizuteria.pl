import { releaseExpiredCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { getOpenCheckoutSessionIdsHoldingVariants } from "~/src/modules/payment/payment.accessors"

const expireOpenCheckoutSession = async (sessionId: string): Promise<boolean> => {
  try {
    const expiredSession = await stripe.checkout.sessions.expire(sessionId)
    await releaseExpiredCheckoutSession(expiredSession)

    return true
  } catch (expireError) {
    console.error(`Failed to expire Checkout Session ${sessionId} holding a product taken off sale:`, expireError)

    return false
  }
}

export const expireCheckoutsHoldingVariants = async (variantIds: readonly string[]): Promise<number> => {
  const sessionIds = await getOpenCheckoutSessionIdsHoldingVariants(variantIds)
  const expired = await Promise.all(sessionIds.map((sessionId) => expireOpenCheckoutSession(sessionId)))

  return expired.filter(Boolean).length
}
