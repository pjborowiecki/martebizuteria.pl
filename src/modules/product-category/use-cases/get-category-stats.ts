import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getCategoryProductTotalQuery } from "~/src/modules/category-on-product/category-on-product.accessors"
import { CATEGORY_QUERY_KEYS, CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"
import { getCategoryStatusCountsQuery } from "~/src/modules/product-category/product-category.server"
import { computeCategoryStats } from "~/src/modules/product-category/product-category.utils"

export const fetchCategoryStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()
  const [[counts], [products]] = await Promise.all([getCategoryStatusCountsQuery.execute(), getCategoryProductTotalQuery.execute()])
  return computeCategoryStats(counts, products?.value ?? 0)
})

export const categoryStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCategoryStatsFn(),
    queryKey: CATEGORY_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: CATEGORY_QUERY_STALE_MS,
  })
