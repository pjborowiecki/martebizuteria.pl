import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { CONSTANTS } from "~/src/constants";

import { inventoryAccessors } from "~/src/modules/inventory/inventory.accessors";

const MIN_VARIANT_ID_LENGTH = 1;
const MIN_QUANTITY = 1;
const ZERO_AVAILABLE = 0;
const EMPTY_ISSUE_COUNT = 0;
const EMPTY_LINE_COUNT = 0;

const cartAvailabilityLineSchema = z.object({
  qty: z.number().int().min(MIN_QUANTITY),
  variantId: z.string().min(MIN_VARIANT_ID_LENGTH)
});

const cartAvailabilityInputSchema = z.object({
  lines: z.array(cartAvailabilityLineSchema)
});

export type CartAvailabilityLine = z.infer<typeof cartAvailabilityLineSchema>;

export interface CartAvailabilityIssue {
  readonly available: number;
  readonly qty: number;
  readonly variantId: string;
}

export interface CartAvailabilityResult {
  readonly hasUnavailableItems: boolean;
  readonly issues: readonly CartAvailabilityIssue[];
}

const CART_AVAILABILITY_STALE_MS = 0;

async function resolveCartAvailability(lines: readonly CartAvailabilityLine[]): Promise<CartAvailabilityResult> {
  const availabilityByVariantId = await inventoryAccessors.getAvailabilityByVariantIds(lines.map((line) => line.variantId));

  const issues = lines.flatMap((line) => {
    const available = availabilityByVariantId.get(line.variantId) ?? ZERO_AVAILABLE;
    if (available >= line.qty) {
      return [];
    }

    return [{ available, qty: line.qty, variantId: line.variantId }];
  });

  return {
    hasUnavailableItems: issues.length > EMPTY_ISSUE_COUNT,
    issues
  };
}

const fetchCartAvailabilityFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cartAvailabilityInputSchema.parse(data))
  .handler(({ data }) => resolveCartAvailability(data.lines));

export const cartAvailabilityQueries = {
  cartAvailabilityQueryOptions: (lines: readonly CartAvailabilityLine[]) =>
    queryOptions({
      enabled: lines.length > EMPTY_LINE_COUNT,
      queryFn: () => fetchCartAvailabilityFn({ data: { lines } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.CART.AVAILABILITY, lines] as const,
      staleTime: CART_AVAILABILITY_STALE_MS
    }),
  fetchCartAvailabilityFn
};
