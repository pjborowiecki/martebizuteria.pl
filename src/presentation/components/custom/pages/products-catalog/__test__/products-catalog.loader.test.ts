import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ImagePrefetchService, prefetchProductThumbnails } from "~/src/lib/image"

import { prefetchProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader"

const requests = vi.hoisted(() => ({
  categories: vi.fn(() => Promise.resolve<never[]>([])),
  collections: vi.fn(() => Promise.resolve<never[]>([])),
  products: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
}))

vi.mock("~/src/lib/image", () => ({
  ImagePrefetchService: vi.fn(),
  prefetchProductThumbnails: vi.fn(),
}))

vi.mock("~/src/lib/dev/catalog-debug-log", () => ({ catalogDebugLog: vi.fn() }))

vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  categoriesQueryOptions: () => ({ queryFn: requests.categories, queryKey: ["categories"] }),
}))

vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  collectionsQueryOptions: () => ({ queryFn: requests.collections, queryKey: ["collections"] }),
}))

vi.mock("~/src/modules/product/use-cases/get-storefront-products-page", () => ({
  storefrontProductsInfiniteQueryOptions: (search: unknown, scope: unknown) => ({
    getNextPageParam: () => {},
    initialPageParam: 0,
    queryFn: requests.products,
    queryKey: ["products", search, scope],
  }),
}))

describe("catalog prefetch", () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const imagePrefetchService = new ImagePrefetchService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it("starts products and both filter requests without waiting for categories", async () => {
    const categories = Promise.withResolvers<never[]>()
    requests.categories.mockReturnValueOnce(categories.promise)

    const loading = prefetchProductsCatalogPage(queryClient, imagePrefetchService, { search: {} })

    expect(requests.products).toHaveBeenCalledTimes(1)
    expect(requests.categories).toHaveBeenCalledTimes(1)
    expect(requests.collections).toHaveBeenCalledTimes(1)
    expect(prefetchProductThumbnails).not.toHaveBeenCalled()

    categories.resolve([])
    await loading

    expect(prefetchProductThumbnails).toHaveBeenCalledWith([], imagePrefetchService)
  })

  it("loads only collections for a category catalog", async () => {
    await prefetchProductsCatalogPage(queryClient, imagePrefetchService, {
      scope: { categoryHandle: "rings" },
      search: {},
    })

    expect(requests.products).toHaveBeenCalledTimes(1)
    expect(requests.categories).not.toHaveBeenCalled()
    expect(requests.collections).toHaveBeenCalledTimes(1)
  })

  it("loads only categories for a collection catalog", async () => {
    await prefetchProductsCatalogPage(queryClient, imagePrefetchService, {
      scope: { collectionHandle: "new-arrivals" },
      search: {},
    })

    expect(requests.products).toHaveBeenCalledTimes(1)
    expect(requests.categories).toHaveBeenCalledTimes(1)
    expect(requests.collections).not.toHaveBeenCalled()
  })

  it("reuses loaded filter data when catalog search changes", async () => {
    await prefetchProductsCatalogPage(queryClient, imagePrefetchService, { search: {} })
    await prefetchProductsCatalogPage(queryClient, imagePrefetchService, { search: { q: "silver" } })

    expect(requests.products).toHaveBeenCalledTimes(2)
    expect(requests.categories).toHaveBeenCalledTimes(1)
    expect(requests.collections).toHaveBeenCalledTimes(1)
  })

  it("propagates product failures to the route error boundary", async () => {
    const failure = new Error("Catalog unavailable")
    requests.products.mockRejectedValueOnce(failure)

    await expect(prefetchProductsCatalogPage(queryClient, imagePrefetchService, { search: {} })).rejects.toBe(failure)
    expect(prefetchProductThumbnails).not.toHaveBeenCalled()
  })
})
