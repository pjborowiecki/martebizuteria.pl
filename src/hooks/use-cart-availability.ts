import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"

import { useCartStore } from "~/src/modules/cart/cart.store"
import {
  type CartAvailabilityIssue,
  type CartAvailabilityLine,
  checkCartAvailabilityQuery,
} from "~/src/modules/cart/use-cases/check-cart-availability"

export const useCartAvailability = (): CartAvailabilityState => {
  const items = useCartStore((state) => state.items)
  const lines = useMemo(
    (): CartAvailabilityLine[] =>
      items.length === 0
        ? EMPTY_LINES
        : items.map((item) => ({
            qty: item.qty,
            variantId: item.variantId,
          })),
    [items],
  )

  const { data, isFetching, isPending } = useQuery(checkCartAvailabilityQuery(lines))
  const issues = data?.issues ?? EMPTY_ISSUES
  const issuesByVariantId = useMemo(() => new Map(issues.map((issue) => [issue.variantId, issue])), [issues])

  return {
    hasUnavailableItems: data?.hasUnavailableItems === true,
    isChecking: lines.length > 0 && (isPending || isFetching),
    isFirstCheck: lines.length > 0 && isPending,
    issues,
    issuesByVariantId,
  }
}

const EMPTY_LINES: CartAvailabilityLine[] = []

const EMPTY_ISSUES: CartAvailabilityIssue[] = []

interface CartAvailabilityState {
  readonly hasUnavailableItems: boolean
  readonly isChecking: boolean
  readonly isFirstCheck: boolean
  readonly issues: readonly CartAvailabilityIssue[]
  readonly issuesByVariantId: ReadonlyMap<string, CartAvailabilityIssue>
}
