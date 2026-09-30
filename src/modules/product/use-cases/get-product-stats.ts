import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getLowStockPublishedProductCountQuery, getProductStatusCountsQuery } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"

const getLowStockPublishedProductCount = async (): Promise<number> => {
  const [row] = await getLowStockPublishedProductCountQuery.execute()

  return row?.count ?? 0
}

export const getProductStats = createServerFn({
  method: "GET",
})
  .middleware([authorized({ product: ["read"] })])
  .handler(async () => {
    const [[counts], lowStock] = await Promise.all([getProductStatusCountsQuery.execute(), getLowStockPublishedProductCount()])

    return {
      active: counts?.active ?? 0,
      archived: counts?.archived ?? 0,
      draft: counts?.draft ?? 0,
      lowStock,
      total: counts?.total ?? 0,
    }
  })

export const getProductStatsQuery = () =>
  queryOptions({
    queryFn: () => getProductStats(),
    queryKey: PRODUCT_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
