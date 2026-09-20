import { type QueryClient } from "@tanstack/react-query"

import { categoriesQueryOptions } from "~/src/modules/product-category/use-cases/get-categories"
import { collectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-collections"
import {
  type StorefrontCatalogScope,
  type StorefrontProductsSearch,
  normalizeStorefrontProductsSearch,
} from "~/src/modules/product/product.storefront-catalog"
import { storefrontProductsInfiniteQueryOptions } from "~/src/modules/product/use-cases/get-storefront-products-page"

import { catalogDebugLog } from "~/src/lib/dev/catalog-debug-log"
import { type ImagePrefetchService, prefetchProductThumbnails } from "~/src/lib/image"
export const prefetchProductsCatalogPage = async (
  queryClient: QueryClient,
  imagePrefetchService: ImagePrefetchService,
  {
    scope,
    search,
  }: {
    readonly scope?: StorefrontCatalogScope
    readonly search: StorefrontProductsSearch
  },
): Promise<void> => {
  const startedAt = performance.now()
  const normalizedSearch = normalizeStorefrontProductsSearch(search)
  catalogDebugLog("prefetch.start", {
    scope,
    search: normalizedSearch,
  })
  const [infiniteData] = await Promise.all([
    queryClient.infiniteQuery(storefrontProductsInfiniteQueryOptions(normalizedSearch, scope)),
    scope?.categoryHandle === undefined
      ? queryClient.query({
          ...categoriesQueryOptions(),
          staleTime: "static",
        })
      : undefined,
    scope?.collectionHandle === undefined
      ? queryClient.query({
          ...collectionsQueryOptions(),
          staleTime: "static",
        })
      : undefined,
  ])
  const [firstPage] = infiniteData.pages
  if (firstPage !== undefined) {
    prefetchProductThumbnails(firstPage.items, imagePrefetchService)
  }
  catalogDebugLog("prefetch.done", {
    ms: Math.round(performance.now() - startedAt),
    scope,
    total: firstPage?.total,
  })
}
