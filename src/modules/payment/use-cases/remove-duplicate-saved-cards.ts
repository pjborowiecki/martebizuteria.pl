import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod/v4"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getStripeCustomerId } from "~/src/integrations/stripe/stripe.customer.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { PAYMENT_METHOD_MUTATION_KEYS, SAVED_CARDS_PAGE_LIMIT } from "~/src/modules/payment/payment.constants"
import { savedPaymentMethodInput } from "~/src/modules/payment/payment.zod"

export const removeDuplicateSavedCards = createServerFn({ method: "POST" })
  .middleware([withRateLimit("remove-duplicate-saved-cards", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof savedPaymentMethodInput>) => savedPaymentMethodInput.parse(input))
  .handler(async ({ context, data: { paymentMethodId } }) => {
    const customerId = await getStripeCustomerId(context.auth.user.id)
    if (customerId === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const [kept, saved] = await Promise.all([
      stripe.paymentMethods.retrieve(paymentMethodId),
      stripe.paymentMethods.list({ customer: customerId, limit: SAVED_CARDS_PAGE_LIMIT, type: "card" }),
    ])
    if (resolveStripeObjectId(kept.customer) !== customerId) {
      throw new AppError(ERROR_CODES.FORBIDDEN)
    }

    const fingerprint = kept.card?.fingerprint
    if (fingerprint === undefined || fingerprint === null) {
      return { removed: 0 }
    }

    const duplicates = saved.data.filter((method) => method.id !== kept.id && method.card?.fingerprint === fingerprint)
    await Promise.all(duplicates.map((method) => stripe.paymentMethods.detach(method.id)))

    return { removed: duplicates.length }
  })

export const removeDuplicateSavedCardsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof removeDuplicateSavedCards>[0]["data"]) => removeDuplicateSavedCards({ data }),
  mutationKey: PAYMENT_METHOD_MUTATION_KEYS.REMOVE_DUPLICATES,
})
