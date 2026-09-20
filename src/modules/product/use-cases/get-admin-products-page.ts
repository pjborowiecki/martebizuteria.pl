import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { type AdminProductsListParams, getAdminProductsPage } from "~/src/modules/product/product.accessors"
import { buildAdminProductsFilterParams, loadAdminListAggregates } from "~/src/modules/product/product.admin-list.server"
import { type AdminProductsPageInput } from "~/src/modules/product/product.admin-list.types"
import { ADMIN_PRODUCTS_PAGE_SIZE, PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { toAdminProductListItem } from "~/src/modules/product/product.utils"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/lib/list-pagination"
const buildAdminProductsListParams = (input: AdminProductsPageInput): AdminProductsListParams => {
  const pageSize = input.pageSize ?? ADMIN_PRODUCTS_PAGE_SIZE
  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    ...buildAdminProductsFilterParams(input),
  }
}
export const fetchAdminProductsPageFn = createServerFn({
  method: "GET",
})
  .validator((input: AdminProductsPageInput) => input)
  .handler(async ({ data }) => {
    await assertAdmin()
    const params = buildAdminProductsListParams(data)
    const { rows, total } = await getAdminProductsPage(params)
    const aggregates = await loadAdminListAggregates(rows)
    const items = rows.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId))
    return buildListPaginationResult(items, total, params)
  })
export const adminProductsPageQueryOptions = (input: AdminProductsPageInput) =>
  queryOptions({
    queryFn: () =>
      fetchAdminProductsPageFn({
        data: input,
      }),
    queryKey: [...PRODUCT_QUERY_KEYS.ADMIN.PAGE, input] as const,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
