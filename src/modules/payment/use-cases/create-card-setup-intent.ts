import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { ensureStripeCustomer } from "~/src/integrations/stripe/stripe.customer.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { PAYMENT_METHOD_MUTATION_KEYS } from "~/src/modules/payment/payment.constants"

export const createCardSetupIntent = createServerFn({ method: "POST" })
  .middleware([withRateLimit("create-card-setup-intent", RATE_LIMITS.SENSITIVE), authorized()])
  .handler(async ({ context }) => {
    const { email, emailVerified, id: userId, isAnonymous, name } = context.auth.user
    if (isAnonymous === true || !emailVerified) {
      throw new AppError(ERROR_CODES.FORBIDDEN)
    }

    const customer = await ensureStripeCustomer({ email, name, userId })
    const intent = await stripe.setupIntents.create({
      customer,
      metadata: { userId },
      payment_method_types: ["card"],
      usage: "on_session",
    })

    if (intent.client_secret === null) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR)
    }

    return { clientSecret: intent.client_secret }
  })

export const createCardSetupIntentMutation = mutationOptions({
  mutationFn: () => createCardSetupIntent(),
  mutationKey: PAYMENT_METHOD_MUTATION_KEYS.CREATE_SETUP_INTENT,
})
