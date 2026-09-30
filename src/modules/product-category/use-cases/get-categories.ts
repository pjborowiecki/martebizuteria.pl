import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { CATEGORY_QUERY_KEYS, CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"
import { getStorefrontRootCategoriesQuery } from "~/src/modules/product-category/product-category.server"
import { withActiveSortedChildren } from "~/src/modules/product-category/product-category.utils"
import { getPublishedProductCountsByRootCategory } from "~/src/modules/product/product.storefront-catalog.accessors"

export const getCategories = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(async () => {
    const [roots, counts] = await Promise.all([getStorefrontRootCategoriesQuery.execute(), getPublishedProductCountsByRootCategory()])
    const countsById = new Map(counts.map((row) => [row.categoryId, row.count]))

    return roots.map((root) => Object.assign(withActiveSortedChildren(root), { productCount: countsById.get(root.id) ?? 0 }))
  })

export const getCategoriesQuery = () =>
  queryOptions({
    queryFn: () => getCategories(),
    queryKey: CATEGORY_QUERY_KEYS.ALL,
    staleTime: CATEGORY_QUERY_STALE_MS,
  })
