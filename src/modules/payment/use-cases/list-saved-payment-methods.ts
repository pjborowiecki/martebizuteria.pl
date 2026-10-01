import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { getStripeCustomerId } from "~/src/integrations/stripe/stripe.customer.server"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { resolveTimezoneCode } from "~/src/modules/_core/constants/timezone"
import { PAYMENT_METHOD_QUERY_KEYS, PAYMENT_METHOD_QUERY_STALE_MS } from "~/src/modules/payment/payment.constants"
import { type Payment } from "~/src/modules/payment/payment.types"
import { isCardExpired } from "~/src/modules/payment/payment.utils"

export const listSavedPaymentMethods = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<Payment["savedMethod"][]> => {
    const customerId = await getStripeCustomerId(context.auth.user.id)
    if (customerId === undefined) {
      return []
    }

    const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card" })
    const timeZone = resolveTimezoneCode(context.auth.user.timezone)

    return methods.data.flatMap((method) => {
      const { card } = method
      if (card === undefined) {
        return []
      }

      return [
        {
          brand: card.brand,
          expMonth: card.exp_month,
          expYear: card.exp_year,
          id: method.id,
          isExpired: isCardExpired(card.exp_month, card.exp_year, timeZone),
          last4: card.last4,
        },
      ]
    })
  })

export const listSavedPaymentMethodsQuery = () =>
  queryOptions({
    queryFn: () => listSavedPaymentMethods(),
    queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED,
    staleTime: PAYMENT_METHOD_QUERY_STALE_MS,
  })
