import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import {
  getAdminCustomerOrderRollupStatsQuery,
  getAdminCustomerTotalCountQuery,
  getAverageProductsPerOrderQuery,
} from "~/src/modules/user/user.accessors"
import { ADMIN_CUSTOMER_QUERY_STALE_MS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { computeAdminCustomerStatsFromAggregates } from "~/src/modules/user/user.utils"

export const fetchAdminCustomerStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()

  const [[totalRow], [rollupRow], [averageProductsPerOrderRow]] = await Promise.all([
    getAdminCustomerTotalCountQuery.execute(),
    getAdminCustomerOrderRollupStatsQuery.execute(),
    getAverageProductsPerOrderQuery.execute(),
  ])

  return computeAdminCustomerStatsFromAggregates({
    averageLtv: rollupRow?.averageLtv ?? 0,
    averageProductsPerOrder: averageProductsPerOrderRow?.value ?? 0,
    customersWithOrders: rollupRow?.customersWithOrders ?? 0,
    repeatCustomers: rollupRow?.repeatCustomers ?? 0,
    total: totalRow?.count ?? 0,
  })
})

export const adminCustomerStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchAdminCustomerStatsFn(),
    queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMER_STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  })
