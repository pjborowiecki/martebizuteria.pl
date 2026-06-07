import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  cartAvailabilityQueries,
  type CartAvailabilityIssue,
  type CartAvailabilityLine
} from "~/src/modules/cart/cart.availability.queries";
import { useCartStore } from "~/src/stores/cart.store";

const EMPTY_LINES: CartAvailabilityLine[] = [];
const EMPTY_ISSUES: CartAvailabilityIssue[] = [];
const EMPTY_CART_COUNT = 0;

interface CartAvailabilityState {
  readonly hasUnavailableItems: boolean;
  readonly isChecking: boolean;
  readonly issues: readonly CartAvailabilityIssue[];
  readonly issuesByVariantId: ReadonlyMap<string, CartAvailabilityIssue>;
}

export function useCartAvailability(): CartAvailabilityState {
  const items = useCartStore((state) => state.items);

  const lines = useMemo(
    (): CartAvailabilityLine[] =>
      items.length === EMPTY_CART_COUNT
        ? EMPTY_LINES
        : items.map((item) => ({
            qty: item.qty,
            variantId: item.variantId
          })),
    [items]
  );

  const { data, isFetching, isPending } = useQuery(cartAvailabilityQueries.cartAvailabilityQueryOptions(lines));

  const issues = data?.issues ?? EMPTY_ISSUES;

  const issuesByVariantId = useMemo(() => new Map(issues.map((issue) => [issue.variantId, issue])), [issues]);

  return {
    hasUnavailableItems: data?.hasUnavailableItems === true,
    isChecking: lines.length > EMPTY_CART_COUNT && (isPending || isFetching),
    issues,
    issuesByVariantId
  };
}
