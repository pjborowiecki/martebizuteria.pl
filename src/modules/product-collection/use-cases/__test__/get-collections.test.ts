import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({
  adminCollections: vi.fn(),
  productCounts: vi.fn(),
  storefrontCollections: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn(), withRequest: {} }))
vi.mock("~/src/modules/collection-on-product/collection-on-product.accessors", () => ({
  getProductCountsQuery: { execute: accessors.productCounts },
}))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  getAdminCollectionsQuery: { execute: accessors.adminCollections },
  getStorefrontCollectionsQuery: { execute: accessors.storefrontCollections },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: () => unknown) => async () => {
        await Promise.resolve()

        return handler()
      },
      middleware: () => builder,
    }

    return builder
  },
}))

import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getAdminCollections, getAdminCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { getCollections, getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"

const TIMESTAMP = new Date("2024-01-01T00:00:00.000Z")

const collectionRow = (overrides: Record<string, unknown> = {}) => ({
  createdAt: TIMESTAMP,
  descriptions: null,
  handle: "bridal",
  id: "collection-1",
  image: null,
  metadata: null,
  rank: 1,
  status: "active",
  titles: { "en-US": "Bridal", "pl-PL": "Ślubna" },
  updatedAt: TIMESTAMP,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  accessors.productCounts.mockResolvedValue([])
  accessors.adminCollections.mockResolvedValue([])
  accessors.storefrontCollections.mockResolvedValue([])
})

describe("getCollections", () => {
  it("returns the storefront rows the accessor produced", async () => {
    const rows = [collectionRow()]
    accessors.storefrontCollections.mockResolvedValue(rows)

    await expect(getCollections()).resolves.toBe(rows)
    expect(accessors.storefrontCollections).toHaveBeenCalledOnce()
  })

  it("returns an empty list when the store has no collections", async () => {
    await expect(getCollections()).resolves.toStrictEqual([])
  })
})

describe("getCollectionsQuery", () => {
  it("caches the storefront list under the public collections key", () => {
    const options = getCollectionsQuery()

    expect(options.queryKey).toStrictEqual(COLLECTION_QUERY_KEYS.ALL)
    expect(options.staleTime).toBe(COLLECTION_QUERY_STALE_MS)
  })

  it("fetches the storefront list when the cache asks for it", async () => {
    const rows = [collectionRow()]
    accessors.storefrontCollections.mockResolvedValue(rows)

    const result = await getCollectionsQuery().queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: COLLECTION_QUERY_KEYS.ALL,
      signal: new AbortController().signal,
    })

    expect(result).toBe(rows)
    expect(accessors.storefrontCollections).toHaveBeenCalledOnce()
  })

  it("hands an empty store straight through to the cache", async () => {
    const result = await getCollectionsQuery().queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: COLLECTION_QUERY_KEYS.ALL,
      signal: new AbortController().signal,
    })

    expect(result).toStrictEqual([])
  })
})

describe("getAdminCollections", () => {
  it("attaches the product count that belongs to each collection", async () => {
    accessors.adminCollections.mockResolvedValue([collectionRow(), collectionRow({ handle: "summer", id: "collection-2" })])
    accessors.productCounts.mockResolvedValue([
      { collectionId: "collection-2", count: 7 },
      { collectionId: "collection-1", count: 3 },
    ])

    const items = await getAdminCollections()

    expect(items.map((item) => [item.id, item.productCount])).toStrictEqual([
      ["collection-1", 3],
      ["collection-2", 7],
    ])
  })

  it("counts a collection nobody has filled as empty", async () => {
    accessors.adminCollections.mockResolvedValue([collectionRow()])

    const items = await getAdminCollections()

    expect(items[0]?.productCount).toBe(0)
  })

  it("ignores counts for collections that are no longer listed", async () => {
    accessors.adminCollections.mockResolvedValue([collectionRow()])
    accessors.productCounts.mockResolvedValue([{ collectionId: "deleted-collection", count: 9 }])

    const items = await getAdminCollections()

    expect(items).toHaveLength(1)
    expect(items[0]?.productCount).toBe(0)
  })

  it("keeps the stored row intact beside the localized titles", async () => {
    accessors.adminCollections.mockResolvedValue([collectionRow()])

    const items = await getAdminCollections()

    expect(items[0]).toMatchObject({ handle: "bridal", rank: 1, status: "active" })
    expect(items[0]?.titles).toStrictEqual({ "en-US": "Bridal", "pl-PL": "Ślubna" })
  })

  it("fills in the missing locales of a partially translated title", async () => {
    accessors.adminCollections.mockResolvedValue([collectionRow({ titles: { "pl-PL": "Ślubna" } })])

    const items = await getAdminCollections()

    expect(items[0]?.titles).toStrictEqual({ "en-US": "", "pl-PL": "Ślubna" })
  })

  it("returns nothing when there are no collections at all", async () => {
    await expect(getAdminCollections()).resolves.toStrictEqual([])
  })
})

describe("getAdminCollectionsQuery", () => {
  it("caches the admin list under its own key and does not refetch on mount", () => {
    const options = getAdminCollectionsQuery()

    expect(options.queryKey).toStrictEqual(COLLECTION_QUERY_KEYS.ADMIN.ALL)
    expect(options.staleTime).toBe(COLLECTION_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches the admin list with its product counts when the cache asks for it", async () => {
    accessors.adminCollections.mockResolvedValue([collectionRow()])
    accessors.productCounts.mockResolvedValue([{ collectionId: "collection-1", count: 4 }])

    const items = await getAdminCollectionsQuery().queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: COLLECTION_QUERY_KEYS.ADMIN.ALL,
      signal: new AbortController().signal,
    })

    expect(items?.[0]).toMatchObject({ handle: "bridal", id: "collection-1", productCount: 4 })
  })

  it("hands an empty admin list straight through to the cache", async () => {
    const items = await getAdminCollectionsQuery().queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: COLLECTION_QUERY_KEYS.ADMIN.ALL,
      signal: new AbortController().signal,
    })

    expect(items).toStrictEqual([])
  })
})
