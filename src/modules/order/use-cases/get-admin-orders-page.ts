import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getAdminOrdersPage as orderGetAdminOrdersPage } from "~/src/modules/order/order.accessors"
import { type AdminOrdersPageInput } from "~/src/modules/order/order.admin-list.types"
import { ADMIN_ORDERS_PAGE_SIZE, ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS, isAdminOrderTab } from "~/src/modules/order/order.constants"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"

import { normalizeAdminSearchTerm } from "~/src/lib/admin-search.server"
import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/lib/list-pagination"
const buildAdminOrdersListParams = (input: AdminOrdersPageInput) => {
  const pageSize = input.pageSize ?? ADMIN_ORDERS_PAGE_SIZE
  const tab = input.tab !== undefined && isAdminOrderTab(input.tab) ? input.tab : undefined
  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    filters: {
      createdAt: input.createdAt,
      fulfillment: input.fulfillment,
      payment: input.payment,
      status: input.status,
      total: input.total,
    },
    search: normalizeAdminSearchTerm(input.search),
    statFilter: input.statFilter,
    tab,
  }
}
export const fetchAdminOrdersPageFn = createServerFn({
  method: "GET",
})
  .validator((input: AdminOrdersPageInput) => input)
  .handler(async ({ data: input }) => {
    await assertAdmin()
    const params = buildAdminOrdersListParams(input)
    const { rows, total } = await orderGetAdminOrdersPage(params)
    const items = rows.map((row) => toAdminOrderListItem(row))
    return buildListPaginationResult(items, total, params)
  })
export const adminOrdersPageQueryOptions = (input: AdminOrdersPageInput) =>
  queryOptions({
    queryFn: () =>
      fetchAdminOrdersPageFn({
        data: input,
      }),
    queryKey: [...ORDER_QUERY_KEYS.ADMIN.PAGE, input] as const,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ORDER_QUERY_STALE_MS,
  })
