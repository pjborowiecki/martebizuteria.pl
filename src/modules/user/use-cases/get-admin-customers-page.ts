import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { type AdminCustomersListParams, getAdminCustomersPage as userGetAdminCustomersPage } from "~/src/modules/user/user.accessors"
import { type AdminCustomersPageInput } from "~/src/modules/user/user.admin-list.types"
import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_QUERY_STALE_MS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { mapCustomerOrderStats, toAdminCustomerListItem } from "~/src/modules/user/user.utils"

import { normalizeAdminSearchTerm } from "~/src/lib/admin-search.server"
import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/lib/list-pagination"
const buildAdminCustomersListParams = (input: AdminCustomersPageInput): AdminCustomersListParams => {
  const pageSize = input.pageSize ?? ADMIN_CUSTOMER_PAGE_SIZE
  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    filters: {
      averageOrderValue: input.averageOrderValue,
      banned: input.banned,
      createdAt: input.createdAt,
      emailVerified: input.emailVerified,
      lastOrderAt: input.lastOrderAt,
      role: input.role,
      totalSpent: input.totalSpent,
    },
    search: normalizeAdminSearchTerm(input.search),
    statFilter: input.statFilter,
  }
}
export const fetchAdminCustomersPageFn = createServerFn({
  method: "GET",
})
  .validator((input: AdminCustomersPageInput) => input)
  .handler(async ({ data: input }) => {
    await assertAdmin()
    const params = buildAdminCustomersListParams(input)
    const { addresses, orderStats, rows, total } = await userGetAdminCustomersPage(params)
    const statsByUserId = mapCustomerOrderStats(orderStats)
    const addressByUserId = new Map(
      addresses
        .filter((row) => row.userId !== null)
        .map((row) => [
          row.userId!,
          {
            city: row.city,
            countryCode: row.countryCode,
            province: row.province,
          },
        ]),
    )
    const items = rows.map((row) => toAdminCustomerListItem(row, statsByUserId.get(row.id), addressByUserId.get(row.id)))
    return buildListPaginationResult(items, total, params)
  })
export const adminCustomersPageQueryOptions = (input: AdminCustomersPageInput) =>
  queryOptions({
    queryFn: () =>
      fetchAdminCustomersPageFn({
        data: input,
      }),
    queryKey: [...USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE, input] as const,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  })
