import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { getAvailabilityByVariantIds } from "~/src/modules/inventory/inventory.accessors"

const cartAvailabilityLineSchema = z.object({
  qty: z.number().int().min(1),
  variantId: z.string().min(1),
})

const cartAvailabilityInputSchema = z.object({
  lines: z.array(cartAvailabilityLineSchema),
})

export type CartAvailabilityLine = z.infer<typeof cartAvailabilityLineSchema>

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

export const fetchCartAvailabilityFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => cartAvailabilityInputSchema.parse(data))
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

export const cartAvailabilityQueryOptions = (lines: readonly CartAvailabilityLine[]) =>
  queryOptions({
    enabled: lines.length > 0,
    queryFn: () => fetchCartAvailabilityFn({ data: { lines } }),
    queryKey: [...CART_QUERY_KEYS.AVAILABILITY, lines] as const,
    staleTime: CART_AVAILABILITY_STALE_MS,
  })
