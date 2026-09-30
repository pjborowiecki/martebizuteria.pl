import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { type AdminCustomersListParams, getAdminCustomersPage as userGetAdminCustomersPage } from "~/src/modules/user/user.accessors"
import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_QUERY_STALE_MS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { mapCustomerOrderStats, toAdminCustomerListItem } from "~/src/modules/user/user.utils"
import { userZodSchemas } from "~/src/modules/user/user.zod"

const buildAdminCustomersListParams = (input: zod.output<typeof userZodSchemas.adminCustomersPageInput>): AdminCustomersListParams => {
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

export const getAdminCustomersPage = createServerFn({
  method: "GET",
})
  .middleware([authorized({ user: ["list"] })])
  .validator((input: zod.input<typeof userZodSchemas.adminCustomersPageInput>) => userZodSchemas.adminCustomersPageInput.parse(input))
  .handler(async ({ data: input }) => {
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

export const getAdminCustomersPageQuery = (input: User["adminCustomersPageInput"]) =>
  queryOptions({
    queryFn: () =>
      getAdminCustomersPage({
        data: input,
      }),
    queryKey: [...USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE, input],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS,
  })
