import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getStorefrontProductsPage, getStorefrontProductsPageQuery } from "~/src/modules/product/use-cases/get-storefront-products-page"

const access = vi.hoisted(() => ({
  categoryByHandle: vi.fn(),
  collectionByHandle: vi.fn(),
  hierarchy: vi.fn(),
  page: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))

vi.mock("~/src/modules/product-category/product-category.server", () => ({
  getCategoryHierarchyQuery: { execute: access.hierarchy },
  getStorefrontCategoryByHandleQuery: { execute: access.categoryByHandle },
}))

vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  getStorefrontCollectionByHandleQuery: { execute: access.collectionByHandle },
}))

vi.mock("~/src/modules/product/product.storefront-catalog.accessors", () => ({
  getStorefrontPublishedProductsPage: access.page,
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { readonly data: unknown }) => unknown) => (options: { readonly data: unknown }) =>
        Promise.resolve(options).then((received) =>
          handler({ data: state.validator === undefined ? received.data : state.validator(received.data) }),
        ),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

const PRODUCT_ROW = { handle: "ring", id: "product-1", title: "Ring" }

beforeEach(() => {
  access.categoryByHandle.mockReset()
  access.collectionByHandle.mockReset()
  access.hierarchy.mockReset()
  access.page.mockReset()
  access.page.mockResolvedValue({ items: [PRODUCT_ROW], total: 1 })
})

describe("getStorefrontProductsPage", () => {
  it("reads the first unfiltered page with the catalog page size", async () => {
    const result = await getStorefrontProductsPage({ data: {} })

    expect(access.page).toHaveBeenCalledWith({
      categoryIds: undefined,
      collectionId: undefined,
      limit: 12,
      maxPriceCents: undefined,
      minPriceCents: undefined,
      offset: 0,
      searchTerm: undefined,
      sort: undefined,
    })
    expect(result).toStrictEqual({ hasMore: false, items: [PRODUCT_ROW], limit: 12, offset: 0, total: 1 })
  })

  it("offsets by whole pages for a later page", async () => {
    access.page.mockResolvedValue({ items: [PRODUCT_ROW], total: 40 })

    const result = await getStorefrontProductsPage({ data: { page: 3 } })

    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ limit: 12, offset: 24 })
    expect(result.hasMore).toBe(true)
    expect(result.offset).toBe(24)
  })

  it("coerces a numeric string page through the validator", async () => {
    await getStorefrontProductsPage({ data: { page: "2" } })

    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ offset: 12 })
  })

  it("rejects a page below the first page", async () => {
    await expect(getStorefrontProductsPage({ data: { page: 0 } })).rejects.toThrow()
  })

  it("raises the page size once a filter is active", async () => {
    await getStorefrontProductsPage({ data: { q: "ring" } })

    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ limit: 100, offset: 0, searchTerm: "ring" })
  })

  it("keeps the small page size when only the default rank sort is set", async () => {
    await getStorefrontProductsPage({ data: { sort: "rank" } })

    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ limit: 12, sort: "rank" })
  })

  it("converts the price range from zloty into minor units", async () => {
    await getStorefrontProductsPage({ data: { maxPrice: 249.99, minPrice: 10.5 } })

    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ maxPriceCents: 24_999, minPriceCents: 1050 })
  })

  it("expands a category handle into the category and its descendants", async () => {
    access.categoryByHandle.mockResolvedValue({ id: "cat-root" })
    access.hierarchy.mockResolvedValue([
      { id: "cat-root", parentId: null },
      { id: "cat-child", parentId: "cat-root" },
      { id: "cat-other", parentId: null },
    ])

    await getStorefrontProductsPage({ data: { category: "rings" } })

    expect(access.categoryByHandle).toHaveBeenCalledWith({ handle: "rings" })
    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ categoryIds: ["cat-root", "cat-child"] })
  })

  it("reads the category hierarchy while the category itself is still loading", async () => {
    const category = Promise.withResolvers<{ id: string }>()
    access.categoryByHandle.mockReturnValue(category.promise)
    access.hierarchy.mockResolvedValue([{ id: "cat-root", parentId: null }])

    const result = getStorefrontProductsPage({ data: { category: "rings" } })
    await vi.waitFor(() => {
      expect(access.categoryByHandle).toHaveBeenCalledOnce()
    })

    expect(access.hierarchy).toHaveBeenCalledOnce()
    category.resolve({ id: "cat-root" })
    await result
    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ categoryIds: ["cat-root"] })
  })

  it("returns an empty page without touching the catalog when the category handle is unknown", async () => {
    access.categoryByHandle.mockResolvedValue(undefined)
    access.hierarchy.mockResolvedValue([])

    const result = await getStorefrontProductsPage({ data: { category: "missing" } })

    expect(access.page).not.toHaveBeenCalled()
    expect(result).toStrictEqual({ hasMore: false, items: [], limit: 100, offset: 0, total: 0 })
  })

  it("resolves a collection handle into its id", async () => {
    access.collectionByHandle.mockResolvedValue({ id: "collection-1" })

    await getStorefrontProductsPage({ data: { collection: "bestsellers" } })

    expect(access.collectionByHandle).toHaveBeenCalledWith({ handle: "bestsellers" })
    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ collectionId: "collection-1" })
  })

  it("returns an empty page without touching the catalog when the collection handle is unknown", async () => {
    access.collectionByHandle.mockResolvedValue(undefined)

    const result = await getStorefrontProductsPage({ data: { collection: "missing" } })

    expect(access.page).not.toHaveBeenCalled()
    expect(result).toStrictEqual({ hasMore: false, items: [], limit: 100, offset: 0, total: 0 })
  })

  it("drops unknown search keys before reaching the accessor", async () => {
    await getStorefrontProductsPage({ data: { page: 1, q: "  ring  " } })

    expect(access.page.mock.calls[0]?.[0]).toStrictEqual({
      categoryIds: undefined,
      collectionId: undefined,
      limit: 100,
      maxPriceCents: undefined,
      minPriceCents: undefined,
      offset: 0,
      searchTerm: "ring",
      sort: undefined,
    })
  })
})

describe("getStorefrontProductsPageQuery", () => {
  it("keys the query by the normalized search", () => {
    const options = getStorefrontProductsPageQuery({ q: "ring", sort: "price_asc" })

    expect(options.queryKey).toStrictEqual(["products", "storefront-page", { q: "ring", sort: "price_asc" }])
    expect(options.initialPageParam).toBe(1)
    expect(options.staleTime).toBe(60_000)
  })

  it("folds the scope handles into the effective search", () => {
    const options = getStorefrontProductsPageQuery({ q: "ring" }, { categoryHandle: "rings" })

    expect(options.queryKey[2]).toStrictEqual({ category: "rings", q: "ring" })
  })

  it("pages forward while nothing but the scope filters the catalog", () => {
    const options = getStorefrontProductsPageQuery({}, { collectionHandle: "bestsellers" })

    expect(options.getNextPageParam({ hasMore: true, items: [], limit: 12, offset: 0, total: 40 }, [], 1, [1])).toBe(2)
  })

  it("stops paging on the last page", () => {
    const options = getStorefrontProductsPageQuery({})

    expect(options.getNextPageParam({ hasMore: false, items: [], limit: 12, offset: 0, total: 1 }, [], 1, [1])).toBeUndefined()
  })

  it("never pages beyond the first page of a filtered catalog", () => {
    const options = getStorefrontProductsPageQuery({ q: "ring" })

    expect(options.getNextPageParam({ hasMore: true, items: [], limit: 100, offset: 0, total: 500 }, [], 1, [1])).toBeUndefined()
  })

  it("fetches each page through the server function", async () => {
    access.page.mockResolvedValue({ items: [PRODUCT_ROW], total: 40 })
    const options = getStorefrontProductsPageQuery({})

    const data = await new QueryClient().infiniteQuery({ ...options, pages: 2 })

    expect(access.page.mock.calls[0]?.[0]).toMatchObject({ limit: 12, offset: 0 })
    expect(access.page.mock.calls[1]?.[0]).toMatchObject({ limit: 12, offset: 12 })
    expect(data.pageParams).toStrictEqual([1, 2])
    expect(data.pages[0]?.items).toStrictEqual([PRODUCT_ROW])
  })
})
