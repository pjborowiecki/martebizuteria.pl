import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getAdminCustomersQuery, getCustomerOrderStatsQuery, getDefaultCustomerAddressesQuery } from "~/src/modules/user/user.accessors"
import { ADMIN_CUSTOMER_QUERY_STALE_MS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { mapCustomerOrderStats, toAdminCustomerListItem } from "~/src/modules/user/user.utils"

export const fetchAdminCustomersFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()

  const [customers, orderStats, addresses] = await Promise.all([
    getAdminCustomersQuery.execute(),
    getCustomerOrderStatsQuery(),
    getDefaultCustomerAddressesQuery(),
  ])

  const statsByUserId = mapCustomerOrderStats(orderStats)
  const addressByUserId = new Map(
    addresses
      .filter((row) => row.userId !== null)
      .map((row) => [row.userId!, { city: row.city, countryCode: row.countryCode, province: row.province }]),
  )

  return customers.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), addressByUserId.get(row.id)))
})

export const adminCustomersQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchAdminCustomersFn(),
    queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMERS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  })
