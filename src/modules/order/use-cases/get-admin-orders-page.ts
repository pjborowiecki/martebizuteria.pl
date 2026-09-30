import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { getAdminOrdersPage as orderGetAdminOrdersPage } from "~/src/modules/order/order.accessors"
import { ADMIN_ORDERS_PAGE_SIZE, ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

const buildAdminOrdersListParams = (input: zod.output<typeof orderZodSchemas.adminOrdersPageInput>) => {
  const pageSize = input.pageSize ?? ADMIN_ORDERS_PAGE_SIZE

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
    tab: input.tab,
  }
}

export const getAdminOrdersPage = createServerFn({
  method: "GET",
})
  .middleware([authorized({ order: ["read"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrdersPageInput>) => orderZodSchemas.adminOrdersPageInput.parse(input))
  .handler(async ({ data: input }) => {
    const params = buildAdminOrdersListParams(input)
    const { rows, total } = await orderGetAdminOrdersPage(params)
    const items = rows.map((row) => toAdminOrderListItem(row))

    return buildListPaginationResult(items, total, params)
  })

export const getAdminOrdersPageQuery = (input: Order["adminPageInput"]) =>
  queryOptions({
    queryFn: () =>
      getAdminOrdersPage({
        data: input,
      }),
    queryKey: [...ORDER_QUERY_KEYS.ADMIN.PAGE, input],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ORDER_QUERY_STALE_MS,
  })
