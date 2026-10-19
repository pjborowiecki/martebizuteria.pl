import { mutationOptions, queryOptions, skipToken } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { getOfferedDeliveryMethodByIdQuery } from "~/src/modules/delivery-method/delivery-method.accessors"
import { resolveDeliveryPrice } from "~/src/modules/delivery-method/delivery-method.utils"
import { getDiscountByCodeForPreviewQuery } from "~/src/modules/discount/discount.accessors"
import {
  DISCOUNT_MUTATION_KEYS,
  DISCOUNT_QUERY_KEYS,
  DISCOUNT_QUERY_STALE_MS,
  DISCOUNT_REJECTION,
  DISCOUNT_TYPE,
  type DiscountType,
} from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { calculateDiscountAmount, normalizeDiscountCode, resolveDiscountPreviewRejection } from "~/src/modules/discount/discount.utils"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"
import { sumOrderLineSubtotal } from "~/src/modules/order/order.utils"
import { getSellPricesByVariantIds } from "~/src/modules/product-variant/product-variant.accessors"

const NO_DELIVERY_COST = 0

const sumBasketAtSellPrices = (lines: DiscountCheckBasket["lines"], priceByVariantId: ReadonlyMap<string, number>): number =>
  sumOrderLineSubtotal(
    lines.flatMap((line) => {
      const price = priceByVariantId.get(line.variantId)

      return price === undefined ? [] : [{ price, qty: line.qty }]
    }),
  )

const priceDeliveryCoveredBy = async (type: DiscountType, deliveryMethodId: string | undefined, itemsSubtotal: number): Promise<number> => {
  if (type !== DISCOUNT_TYPE.FREE_SHIPPING || deliveryMethodId === undefined) {
    return NO_DELIVERY_COST
  }

  const method = await getOfferedDeliveryMethodByIdQuery(deliveryMethodId)

  return method === undefined
    ? NO_DELIVERY_COST
    : resolveDeliveryPrice({ discount: undefined, freeDeliveryThreshold: method.freeDeliveryThreshold, itemsSubtotal, price: method.price })
}

export const validateDiscountCode = createServerFn({ method: "POST" })
  .middleware([withRateLimit("discount-validate", RATE_LIMITS.CHECKOUT)])
  .validator((input: ValidateDiscountInput) => discountZodSchemas.validateDiscountInput.parse(input))
  .handler(async ({ data }): Promise<Discount["validation"]> => {
    const session = await getRequestSession()
    const customer = { email: data.email ?? session?.user.email, userId: session?.user.id }
    const [row, priceByVariantId] = await Promise.all([
      getDiscountByCodeForPreviewQuery({ code: normalizeDiscountCode(data.code), customer, heldSessionId: data.heldSessionId }),
      getSellPricesByVariantIds(data.lines.map((line) => line.variantId)),
    ])
    if (row === undefined) {
      return { rejection: DISCOUNT_REJECTION.NOT_FOUND }
    }

    const itemsSubtotal = sumBasketAtSellPrices(data.lines, priceByVariantId)
    const rejection = resolveDiscountPreviewRejection({ itemsSubtotal, now: new Date(), row })
    if (rejection !== undefined) {
      return { rejection }
    }

    return {
      applied: {
        amountMinorUnits: calculateDiscountAmount({
          itemsSubtotal,
          row,
          shippingTotal: await priceDeliveryCoveredBy(row.type, data.deliveryMethodId, itemsSubtotal),
        }),
        code: row.code,
        discountId: row.id,
        type: row.type,
      },
    }
  })

export const validateDiscountCodeQuery = ({ code, ...basket }: ValidateDiscountCodeQueryInput) =>
  queryOptions({
    queryFn: code === undefined || code === "" ? skipToken : () => validateDiscountCode({ data: { ...basket, code } }),
    queryKey: [...DISCOUNT_QUERY_KEYS.VALIDATION, { ...basket, code }],
    staleTime: DISCOUNT_QUERY_STALE_MS,
  })

export const validateDiscountCodeMutation = mutationOptions({
  mutationFn: async (data: ValidateDiscountInput, { client }) => {
    const result = await validateDiscountCode({ data })
    client.setQueryData(validateDiscountCodeQuery(data).queryKey, result)

    return result
  },
  mutationKey: DISCOUNT_MUTATION_KEYS.VALIDATE,
})

type ValidateDiscountInput = zod.input<typeof discountZodSchemas.validateDiscountInput>

export type DiscountCheckBasket = Omit<ValidateDiscountInput, "code">

interface ValidateDiscountCodeQueryInput extends DiscountCheckBasket {
  readonly code: string | undefined
}
