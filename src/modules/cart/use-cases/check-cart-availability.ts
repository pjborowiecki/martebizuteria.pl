import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { getAvailabilityByVariantIds } from "~/src/modules/inventory/inventory.accessors"

const cartAvailabilityLineSchema = zod.object({
  qty: zod.number().int().min(1),
  variantId: zod.string().min(1),
})

const cartAvailabilityInputSchema = zod.object({
  lines: zod.array(cartAvailabilityLineSchema),
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
}

const CART_AVAILABILITY_STALE_MS = 0

export const checkCartAvailability = createServerFn({ method: "POST" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof cartAvailabilityInputSchema>) => cartAvailabilityInputSchema.parse(input))
  .handler(async ({ data: { lines } }): Promise<CartAvailabilityResult> => {
    const availabilityByVariantId = await getAvailabilityByVariantIds(lines.map((line) => line.variantId))

    const issues = lines.flatMap((line) => {
      const available = availabilityByVariantId.get(line.variantId) ?? 0
      if (available >= line.qty) {
        return []
      }

      return [{ available, qty: line.qty, variantId: line.variantId }]
    })

    return {
      hasUnavailableItems: issues.length > 0,
      issues,
    }
  })

export const checkCartAvailabilityQuery = (lines: readonly CartAvailabilityLine[]) =>
  queryOptions({
    enabled: lines.length > 0,
    queryFn: () => checkCartAvailability({ data: { lines: [...lines] } }),
    queryKey: [...CART_QUERY_KEYS.AVAILABILITY, lines],
    staleTime: CART_AVAILABILITY_STALE_MS,
  })
