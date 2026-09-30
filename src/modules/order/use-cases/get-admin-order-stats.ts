import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminOrderStats as orderGetAdminOrderStats } from "~/src/modules/order/order.accessors"
import { ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"

export const getAdminOrderStats = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .handler(() => orderGetAdminOrderStats())

export const getAdminOrderStatsQuery = () =>
  queryOptions({
    queryFn: () => getAdminOrderStats(),
    queryKey: ORDER_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ORDER_QUERY_STALE_MS,
  })
