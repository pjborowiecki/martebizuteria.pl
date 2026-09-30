import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminProductsCatalogList, loadAdminListAggregates } from "~/src/modules/product/product.admin-list.server"
import { PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { toAdminProductListItem } from "~/src/modules/product/product.utils"

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .handler(async () => {
    const products = await getAdminProductsCatalogList()
    const aggregates = await loadAdminListAggregates(products)

    return products.map((row) => toAdminProductListItem(row, aggregates.statsByProductId, aggregates.skuSummaryByProductId))
  })

export const getAdminProductsQuery = () =>
  queryOptions({
    queryFn: () => getAdminProducts(),
    queryKey: PRODUCT_QUERY_KEYS.ADMIN.ALL,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
