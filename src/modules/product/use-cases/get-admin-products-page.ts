import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { type AdminProductsListParams, getAdminProductsPage as productGetAdminProductsPage } from "~/src/modules/product/product.accessors"
import { buildAdminProductsFilterParams, loadAdminListAggregates } from "~/src/modules/product/product.admin-list.server"
import { ADMIN_PRODUCTS_PAGE_SIZE, PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"
import { toAdminProductListItem } from "~/src/modules/product/product.utils"
import { productZodSchemas } from "~/src/modules/product/product.zod"

const buildAdminProductsListParams = (input: zod.output<typeof productZodSchemas.adminProductsPageInput>): AdminProductsListParams => {
  const pageSize = input.pageSize ?? ADMIN_PRODUCTS_PAGE_SIZE

  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    ...buildAdminProductsFilterParams(input),
  }
}

export const getAdminProductsPage = createServerFn({
  method: "GET",
})
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof productZodSchemas.adminProductsPageInput>) => productZodSchemas.adminProductsPageInput.parse(input))
  .handler(async ({ data }) => {
    const params = buildAdminProductsListParams(data)
    const { rows, total } = await productGetAdminProductsPage(params)
    const aggregates = await loadAdminListAggregates(rows)
    const items = rows.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId))

    return buildListPaginationResult(items, total, params)
  })

export const getAdminProductsPageQuery = (input: Product["adminProductsPageInput"]) =>
  queryOptions({
    queryFn: () =>
      getAdminProductsPage({
        data: input,
      }),
    queryKey: [...PRODUCT_QUERY_KEYS.ADMIN.PAGE, input],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
