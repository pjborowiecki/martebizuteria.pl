import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { CATEGORY_QUERY_KEYS, CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"
import { getCategoryHierarchyQuery, getStorefrontCategoryByHandleQuery } from "~/src/modules/product-category/product-category.server"
import { collectDescendantCategoryIds } from "~/src/modules/product-category/product-category.utils"
import { getPublishedProductsByCategoryIds } from "~/src/modules/product/product.accessors"
import { PRODUCT_STOREFRONT_LIST_LIMIT } from "~/src/modules/product/product.constants"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/lib/list-pagination"

interface CategoryByHandleInput {
  readonly handle: string
  readonly page?: number
}

export const fetchCategoryByHandleFn = createServerFn({ method: "GET" })
  .validator((input: CategoryByHandleInput) => input)
  .handler(async ({ data: { handle, page = LIST_PAGE_FIRST } }) => {
    const cat = await getStorefrontCategoryByHandleQuery.execute({ handle })
    if (cat === undefined) {
      return false
    }
    const hierarchy = await getCategoryHierarchyQuery.execute()
    const listParams = listPaginationParamsFromPage(page, PRODUCT_STOREFRONT_LIST_LIMIT)
    const categoryIds = collectDescendantCategoryIds(cat.id, hierarchy)
    const { items, total } = await getPublishedProductsByCategoryIds(categoryIds, listParams)
    return { ...cat, products: buildListPaginationResult(items, total, listParams) }
  })

export const categoryQueryOptions = (handle: string, page = LIST_PAGE_FIRST) =>
  queryOptions({
    queryFn: () => fetchCategoryByHandleFn({ data: { handle, page } }),
    queryKey: [...CATEGORY_QUERY_KEYS.BY_HANDLE, handle, page] as const,
    staleTime: CATEGORY_QUERY_STALE_MS,
  })
