import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod/v4"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getStripeCustomerId } from "~/src/integrations/stripe/stripe.customer.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { PAYMENT_METHOD_MUTATION_KEYS } from "~/src/modules/payment/payment.constants"
import { savedPaymentMethodInput } from "~/src/modules/payment/payment.zod"

export const deleteSavedPaymentMethod = createServerFn({ method: "POST" })
  .middleware([withRateLimit("delete-saved-payment-method", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof savedPaymentMethodInput>) => savedPaymentMethodInput.parse(input))
  .handler(async ({ context, data: { paymentMethodId } }) => {
    const [customerId, method] = await Promise.all([
      getStripeCustomerId(context.auth.user.id),
      stripe.paymentMethods.retrieve(paymentMethodId),
    ])
    if (customerId === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (resolveStripeObjectId(method.customer) !== customerId) {
      throw new AppError(ERROR_CODES.FORBIDDEN)
    }

    await stripe.paymentMethods.detach(paymentMethodId)

    return { ok: true }
  })

export const deleteSavedPaymentMethodMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteSavedPaymentMethod>[0]["data"]) => deleteSavedPaymentMethod({ data }),
  mutationKey: PAYMENT_METHOD_MUTATION_KEYS.DELETE,
})
