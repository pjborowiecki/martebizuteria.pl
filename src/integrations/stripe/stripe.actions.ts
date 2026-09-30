import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { createCheckoutSessionInputSchema, updateCheckoutSessionInputSchema } from "~/src/integrations/stripe/stripe.actions.schemas"

export const createCheckoutSessionFn = createServerFn({ method: "POST" })
  .middleware([withRateLimit("checkout-create", RATE_LIMITS.CHECKOUT)])
  .validator((data: unknown) => createCheckoutSessionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { handleCreateCheckoutSession } = await import("~/src/integrations/stripe/stripe.actions.server")

    return handleCreateCheckoutSession(data)
  })

export const updateCheckoutSessionFn = createServerFn({ method: "POST" })
  .middleware([withRateLimit("checkout-update", RATE_LIMITS.CHECKOUT)])
  .validator((data: unknown) => updateCheckoutSessionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { handleUpdateCheckoutSession } = await import("~/src/integrations/stripe/stripe.actions.server")

    return handleUpdateCheckoutSession(data)
  })
