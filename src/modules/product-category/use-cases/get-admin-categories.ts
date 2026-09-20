import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getProductCountsQuery } from "~/src/modules/category-on-product/category-on-product.accessors"
import { CATEGORY_QUERY_KEYS, CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"
import { getAdminCategoriesQuery } from "~/src/modules/product-category/product-category.server"
import { coerceCategoryLocaleMap, toAdminCategoryListItem } from "~/src/modules/product-category/product-category.utils"

export const fetchAdminCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()
  const [categories, counts] = await Promise.all([getAdminCategoriesQuery.execute(), getProductCountsQuery.execute()])
  const countByCategoryId = new Map(counts.map((entry) => [entry.categoryId, entry.count]))
  const titlesById = new Map(categories.map((row) => [row.id, coerceCategoryLocaleMap(row.titles)]))
  return categories.map((row) => toAdminCategoryListItem(row, countByCategoryId.get(row.id) ?? 0, titlesById))
})

export const adminCategoriesQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchAdminCategoriesFn(),
    queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: CATEGORY_QUERY_STALE_MS,
  })
