import { queryOptions, skipToken } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { releaseExpiredCheckoutSession } from "~/src/integrations/stripe/stripe.actions.server"
import { CHECKOUT_SESSION_ID_MAX_LENGTH } from "~/src/integrations/stripe/stripe.constants"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { isCheckoutSessionProcessing } from "~/src/integrations/stripe/stripe.utils"

import { CHECKOUT_QUERY_KEYS } from "~/src/modules/checkout/checkout.constants"
import { getPaymentContextByTransactionId } from "~/src/modules/payment/payment.accessors"

const CHECKOUT_SESSION_STATUS_RETRIES = 2

const checkoutSessionStatusInputSchema = zod.object({
  sessionId: zod.string().trim().min(1).max(CHECKOUT_SESSION_ID_MAX_LENGTH),
})

export type CheckoutSessionStatus = "closed" | "complete" | "open" | "processing"

const readStripeSessionStatus = async (sessionId: string): Promise<CheckoutSessionStatus> => {
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] })
  if (stripeSession.status === "complete") {
    return "complete"
  }

  if (stripeSession.status === "open") {
    return isCheckoutSessionProcessing(stripeSession) ? "processing" : "open"
  }

  if (stripeSession.status === "expired") {
    await releaseExpiredCheckoutSession(stripeSession)
  }

  return "closed"
}

export const getCheckoutSessionStatus = createServerFn({ method: "POST" })
  .middleware([withRateLimit("checkout-status", RATE_LIMITS.CHECKOUT)])
  .validator((input: zod.input<typeof checkoutSessionStatusInputSchema>) => checkoutSessionStatusInputSchema.parse(input))
  .handler(async ({ data: { sessionId } }): Promise<CheckoutSessionStatus> => {
    const context = await getPaymentContextByTransactionId(sessionId)
    if (context === undefined || context.paymentStatus === "failed") {
      return "closed"
    }

    if (context.paymentStatus !== "pending") {
      return "complete"
    }

    const status = await readStripeSessionStatus(sessionId)
    if (status === "complete" || status === "closed" || context.userId === undefined) {
      return status
    }

    const requestSession = await getRequestSession()

    return requestSession?.user.id === context.userId ? status : "closed"
  })

export const checkoutSessionStatusQuery = (sessionId: string | undefined) =>
  queryOptions({
    gcTime: 0,
    queryFn: sessionId === undefined ? skipToken : () => getCheckoutSessionStatus({ data: { sessionId } }),
    queryKey: [...CHECKOUT_QUERY_KEYS.SESSION_STATUS, sessionId],
    retry: CHECKOUT_SESSION_STATUS_RETRIES,
    staleTime: "static",
  })
