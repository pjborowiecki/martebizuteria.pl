import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getAdminOrderStats } from "~/src/modules/order/order.accessors"
import { ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"

export const fetchAdminOrderStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()
  return getAdminOrderStats()
})

export const adminOrderStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchAdminOrderStatsFn(),
    queryKey: ORDER_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ORDER_QUERY_STALE_MS,
  })
