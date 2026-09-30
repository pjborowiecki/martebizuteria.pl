import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminDiscountStats } from "~/src/modules/discount/discount.accessors"
import { DISCOUNT_QUERY_KEYS, DISCOUNT_QUERY_STALE_MS } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

export const getDiscountStats = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .handler((): Promise<Discount["adminStats"]> => getAdminDiscountStats(new Date()))

export const getDiscountStatsQuery = () =>
  queryOptions({
    queryFn: () => getDiscountStats(),
    queryKey: DISCOUNT_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: DISCOUNT_QUERY_STALE_MS,
  })
