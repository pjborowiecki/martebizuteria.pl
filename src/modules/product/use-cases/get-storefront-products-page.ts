import { type InfiniteData, infiniteQueryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import {
  LIST_PAGE_FIRST,
  LIST_PAGE_STEP,
  type ListPaginationResult,
  buildListPaginationResult,
  listPaginationParamsFromPage,
} from "~/src/modules/_core/utils/pagination"
import { getCategoryHierarchyQuery, getStorefrontCategoryByHandleQuery } from "~/src/modules/product-category/product-category.server"
import { collectDescendantCategoryIds } from "~/src/modules/product-category/product-category.utils"
import { getStorefrontCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"
import {
  PRODUCT_QUERY_KEYS,
  PRODUCT_QUERY_STALE_MS,
  PRODUCT_STOREFRONT_CATALOG_PAGE_SIZE,
  PRODUCT_STOREFRONT_FILTERED_MAX,
} from "~/src/modules/product/product.constants"
import {
  type StorefrontCatalogScope,
  type StorefrontProductsSearch,
  buildEffectiveStorefrontProductsSearch,
  hasActiveStorefrontProductFilters,
  normalizeStorefrontProductsSearch,
  storefrontCatalogFilterOptions,
  storefrontProductsSearchSchema,
} from "~/src/modules/product/product.storefront-catalog"
import { getStorefrontPublishedProductsPage } from "~/src/modules/product/product.storefront-catalog.accessors"

import { catalogDebugLog } from "~/src/lib/catalog-debug-log"

const CENTS_PER_PLN = 100

const storefrontProductsPageInputSchema = storefrontProductsSearchSchema.extend({
  page: zod.coerce.number().int().min(LIST_PAGE_FIRST).optional(),
})

const resolveStorefrontCategoryIdsForSearch = async (categoryHandle: string | undefined): Promise<string[] | undefined> => {
  if (categoryHandle === undefined) {
    return undefined
  }

  const category = await getStorefrontCategoryByHandleQuery.execute({
    handle: categoryHandle,
  })

  if (category === undefined) {
    return []
  }

  const hierarchy = await getCategoryHierarchyQuery.execute()

  return collectDescendantCategoryIds(category.id, hierarchy)
}

const resolveStorefrontCollectionIdForSearch = async (collectionHandle: string | undefined): Promise<string | undefined> => {
  if (collectionHandle === undefined) {
    return undefined
  }

  const collection = await getStorefrontCollectionByHandleQuery.execute({
    handle: collectionHandle,
  })

  return collection?.id
}

const resolveStorefrontCatalogFilters = async (search: StorefrontProductsSearch) => {
  const [categoryIds, collectionId] = await Promise.all([
    resolveStorefrontCategoryIdsForSearch(search.category),
    resolveStorefrontCollectionIdForSearch(search.collection),
  ])

  return {
    categoryIds,
    collectionId,
    maxPriceCents: search.maxPrice === undefined ? undefined : Math.round(search.maxPrice * CENTS_PER_PLN),
    minPriceCents: search.minPrice === undefined ? undefined : Math.round(search.minPrice * CENTS_PER_PLN),
    searchTerm: search.q,
    sort: search.sort,
  }
}

type StorefrontProductsPage = ListPaginationResult<Awaited<ReturnType<typeof getStorefrontPublishedProductsPage>>["items"][number]>

export const getStorefrontProductsPage = createServerFn({
  method: "GET",
})
  .middleware([withRequest])
  .validator((input: zod.input<typeof storefrontProductsPageInputSchema>) => storefrontProductsPageInputSchema.parse(input))
  .handler(async ({ data: input }) => {
    const startedAt = performance.now()
    const search = normalizeStorefrontProductsSearch(input)
    const page = input.page ?? LIST_PAGE_FIRST
    const filtered = hasActiveStorefrontProductFilters(search)
    const pageSize = filtered ? PRODUCT_STOREFRONT_FILTERED_MAX : PRODUCT_STOREFRONT_CATALOG_PAGE_SIZE
    const listParams = listPaginationParamsFromPage(page, pageSize)
    const filters = await resolveStorefrontCatalogFilters(search)
    catalogDebugLog("storefrontProductsPage.start", {
      filters,
      page,
      search,
    })

    if (filters.categoryIds?.length === 0) {
      catalogDebugLog("storefrontProductsPage.emptyCategory", {
        search,
      })

      return buildListPaginationResult([], 0, listParams)
    }

    const { items, total } = await getStorefrontPublishedProductsPage({
      ...listParams,
      categoryIds: filters.categoryIds,
      collectionId: filters.collectionId,
      maxPriceCents: filters.maxPriceCents,
      minPriceCents: filters.minPriceCents,
      searchTerm: filters.searchTerm,
      sort: filters.sort,
    })
    catalogDebugLog("storefrontProductsPage.done", {
      collectionId: filters.collectionId,
      itemCount: items.length,
      ms: Math.round(performance.now() - startedAt),
      page,
      total,
    })

    return buildListPaginationResult(items, total, listParams)
  })

export const getStorefrontProductsPageQuery = (search: StorefrontProductsSearch, scope?: StorefrontCatalogScope) => {
  const normalized = normalizeStorefrontProductsSearch(search)
  const effective = buildEffectiveStorefrontProductsSearch(normalized, scope)
  const filtered = hasActiveStorefrontProductFilters(effective, storefrontCatalogFilterOptions(scope))

  return infiniteQueryOptions<
    StorefrontProductsPage,
    Error,
    InfiniteData<StorefrontProductsPage, number>,
    readonly [...typeof PRODUCT_QUERY_KEYS.STOREFRONT_PAGE, StorefrontProductsSearch],
    number
  >({
    getNextPageParam: (lastPage, _allPages, lastPageParam) => (!filtered && lastPage.hasMore ? lastPageParam + LIST_PAGE_STEP : undefined),
    initialPageParam: LIST_PAGE_FIRST,
    queryFn: ({ pageParam }) =>
      getStorefrontProductsPage({
        data: {
          ...effective,
          page: pageParam,
        },
      }),
    queryKey: [...PRODUCT_QUERY_KEYS.STOREFRONT_PAGE, effective],
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
}
