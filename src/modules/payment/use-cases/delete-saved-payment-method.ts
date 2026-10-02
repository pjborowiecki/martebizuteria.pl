import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getStripeCustomerId } from "~/src/integrations/stripe/stripe.customer.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { PAYMENT_METHOD_MUTATION_KEYS } from "~/src/modules/payment/payment.constants"

const PAYMENT_METHOD_ID_MAX_LENGTH = 255

const deleteSavedPaymentMethodInput = zod.object({
  paymentMethodId: zod.string().trim().min(1).max(PAYMENT_METHOD_ID_MAX_LENGTH),
})

export const deleteSavedPaymentMethod = createServerFn({ method: "POST" })
  .middleware([withRateLimit("delete-saved-payment-method", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof deleteSavedPaymentMethodInput>) => deleteSavedPaymentMethodInput.parse(input))
  .handler(async ({ context, data: { paymentMethodId } }) => {
    const customerId = await getStripeCustomerId(context.auth.user.id)
    if (customerId === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const method = await stripe.paymentMethods.retrieve(paymentMethodId)
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
