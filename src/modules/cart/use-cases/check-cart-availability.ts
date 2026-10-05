import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { CART_LINES_MAX, CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { type CartUnitPrice } from "~/src/modules/cart/cart.pricing"
import { getAvailabilityByVariantIds } from "~/src/modules/inventory/inventory.accessors"
import { sumHeldQuantity } from "~/src/modules/inventory/inventory.availability.utils"
import { getHeldLinesByTransactionId } from "~/src/modules/payment/payment.accessors"
import { getSellPricesByVariantIds } from "~/src/modules/product-variant/product-variant.accessors"
import { PRODUCT_VARIANT_COLUMN_LENGTH } from "~/src/modules/product-variant/product-variant.constants"

const CHECKOUT_SESSION_ID_MAX_LENGTH = 255

const cartAvailabilityLineSchema = zod.object({
  qty: zod.number().int().min(1),
  variantId: zod.string().min(1).max(PRODUCT_VARIANT_COLUMN_LENGTH.id),
})

const cartAvailabilityInputSchema = zod.object({
  heldSessionId: zod.string().min(1).max(CHECKOUT_SESSION_ID_MAX_LENGTH).optional(),
  lines: zod.array(cartAvailabilityLineSchema).max(CART_LINES_MAX),
})

export type CartAvailabilityLine = zod.infer<typeof cartAvailabilityLineSchema>

export interface CartAvailabilityIssue {
  readonly available: number
  readonly qty: number
  readonly variantId: string
}

export interface CartAvailabilityResult {
  readonly hasUnavailableItems: boolean
  readonly issues: readonly CartAvailabilityIssue[]
  readonly prices: readonly CartUnitPrice[]
}

const CART_AVAILABILITY_STALE_MS = 0

export const checkCartAvailability = createServerFn({ method: "POST" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof cartAvailabilityInputSchema>) => cartAvailabilityInputSchema.parse(input))
  .handler(async ({ data: { heldSessionId, lines } }): Promise<CartAvailabilityResult> => {
    const variantIds = lines.map((line) => line.variantId)
    const [availabilityByVariantId, priceByVariantId, heldLines] = await Promise.all([
      getAvailabilityByVariantIds(variantIds),
      getSellPricesByVariantIds(variantIds),
      heldSessionId === undefined ? [] : getHeldLinesByTransactionId(heldSessionId),
    ])

    const issues = lines.flatMap((line) => {
      const available = (availabilityByVariantId.get(line.variantId) ?? 0) + sumHeldQuantity(heldLines, line.variantId)
      if (available >= line.qty) {
        return []
      }

      return [{ available, qty: line.qty, variantId: line.variantId }]
    })

    return {
      hasUnavailableItems: issues.length > 0,
      issues,
      prices: [...priceByVariantId].map(([variantId, unitPrice]) => ({ unitPrice, variantId })),
    }
  })

export const checkCartAvailabilityQuery = (lines: readonly CartAvailabilityLine[], heldSessionId: string | undefined) =>
  queryOptions({
    enabled: lines.length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => checkCartAvailability({ data: { heldSessionId, lines: [...lines] } }),
    queryKey: [...CART_QUERY_KEYS.AVAILABILITY, lines, heldSessionId],
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: CART_AVAILABILITY_STALE_MS,
  })
