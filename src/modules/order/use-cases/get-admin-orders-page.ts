import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { getAdminOrdersPage as orderGetAdminOrdersPage } from "~/src/modules/order/order.accessors"
import { ADMIN_ORDERS_PAGE_SIZE, ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { loadAdminOrderListItems } from "~/src/modules/order/use-cases/load-admin-order-list-items.server"

const buildAdminOrdersListParams = (input: zod.output<typeof orderZodSchemas.adminOrdersPageInput>, timeZone: string) => {
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
    timeZone,
    userId: input.userId,
  }
}

export const getAdminOrdersPage = createServerFn({
  method: "GET",
})
  .middleware([authorized({ order: ["read"] })])
  .validator((input: zod.input<typeof orderZodSchemas.adminOrdersPageInput>) => orderZodSchemas.adminOrdersPageInput.parse(input))
  .handler(async ({ data: input }) => {
    const { timeZone } = await resolveRequestDisplayPreferences()
    const params = buildAdminOrdersListParams(input, timeZone)
    const { rows, total } = await orderGetAdminOrdersPage(params)
    const items = await loadAdminOrderListItems(rows, getCurrentLocale())

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
