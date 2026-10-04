import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { queryKeyPrefixesOverlap } from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"
import { STOREFRONT_REALTIME_QUERY_PREFIXES } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getAdminCollections, getAdminCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { getCollectionStats, getCollectionStatsQuery } from "~/src/modules/product-collection/use-cases/get-collection-stats"
import { getCollections, getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"
import { getStorefrontCollection, getStorefrontCollectionQuery } from "~/src/modules/product-collection/use-cases/get-storefront-collection"

const operations = vi.hoisted(() => ({
  adminCollections: vi.fn(),
  byHandle: vi.fn(),
  productCounts: vi.fn(),
  productTotal: vi.fn(),
  statusCounts: vi.fn(),
  storefrontCollections: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn(), withRequest: vi.fn() }))
vi.mock("~/src/modules/collection-on-product/collection-on-product.accessors", () => ({
  getCollectionProductTotalQuery: { execute: operations.productTotal },
  getProductCountsQuery: { execute: operations.productCounts },
}))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  getAdminCollectionsQuery: { execute: operations.adminCollections },
  getCollectionStatusCountsQuery: { execute: operations.statusCounts },
  getStorefrontCollectionByHandleQuery: { execute: operations.byHandle },
  getStorefrontCollectionsQuery: { execute: operations.storefrontCollections },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validate: ((input: unknown) => unknown) | undefined } = { validate: undefined }
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => async (options?: { data: unknown }) => {
        await Promise.resolve()

        return handler({ data: state.validate === undefined ? options?.data : state.validate(options?.data) })
      },
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        state.validate = validate

        return builder
      },
    }

    return builder
  },
}))

const AT = new Date("2026-01-01T00:00:00.000Z")

const collectionRow = (id: string, titles: unknown) => ({
  createdAt: AT,
  descriptions: null,
  handle: id,
  id,
  image: null,
  metadata: null,
  rank: 0,
  status: "active",
  titles,
  updatedAt: AT,
})

describe("getAdminCollections", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("joins each collection to its product count", async () => {
    operations.adminCollections.mockResolvedValue([
      collectionRow("srebro-925", { "en-US": "Silver 925", "pl-PL": "Srebro 925" }),
      collectionRow("zloto", { "en-US": "Gold", "pl-PL": "Złoto" }),
    ])
    operations.productCounts.mockResolvedValue([{ collectionId: "zloto", count: 4 }])

    const rows = await getAdminCollections()

    expect(rows.map((row) => [row.id, row.productCount])).toStrictEqual([
      ["srebro-925", 0],
      ["zloto", 4],
    ])
  })

  it("coerces a legacy string title into a locale map", async () => {
    operations.adminCollections.mockResolvedValue([collectionRow("srebro-925", "Srebro 925")])
    operations.productCounts.mockResolvedValue([])

    const [row] = await getAdminCollections()

    expect(row?.titles).toStrictEqual({ "en-US": "", "pl-PL": "Srebro 925" })
  })

  it("returns nothing when the catalog holds no collections", async () => {
    operations.adminCollections.mockResolvedValue([])
    operations.productCounts.mockResolvedValue([])

    await expect(getAdminCollections()).resolves.toStrictEqual([])
  })
})

describe("getAdminCollectionsQuery", () => {
  it("caches the admin list under its own key without refetching on focus", () => {
    const options = getAdminCollectionsQuery()

    expect(options.queryKey).toStrictEqual(COLLECTION_QUERY_KEYS.ADMIN.ALL)
    expect(options.staleTime).toBe(COLLECTION_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

describe("getCollectionStats", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("averages the products per collection to one decimal", async () => {
    operations.statusCounts.mockResolvedValue([{ active: 2, draft: 1, total: 3 }])
    operations.productTotal.mockResolvedValue([{ value: 10 }])

    await expect(getCollectionStats()).resolves.toStrictEqual({ active: 2, avgProducts: 3.3, draft: 1, total: 3 })
  })

  it("reports zeros when there are no collections at all", async () => {
    operations.statusCounts.mockResolvedValue([])
    operations.productTotal.mockResolvedValue([])

    await expect(getCollectionStats()).resolves.toStrictEqual({ active: 0, avgProducts: 0, draft: 0, total: 0 })
  })

  it("treats a missing product total as zero products", async () => {
    operations.statusCounts.mockResolvedValue([{ active: 1, draft: 0, total: 1 }])
    operations.productTotal.mockResolvedValue([])

    await expect(getCollectionStats()).resolves.toStrictEqual({ active: 1, avgProducts: 0, draft: 0, total: 1 })
  })
})

describe("getCollectionStatsQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("caches the stats under their own key", () => {
    const options = getCollectionStatsQuery()

    expect(options.queryKey).toStrictEqual(COLLECTION_QUERY_KEYS.ADMIN.STATS)
    expect(options.staleTime).toBe(COLLECTION_QUERY_STALE_MS)
  })

  it("never refetches the stats on mount or focus", () => {
    const options = getCollectionStatsQuery()

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("reads the counts when the cache runs the query", async () => {
    operations.statusCounts.mockResolvedValue([{ active: 2, draft: 1, total: 3 }])
    operations.productTotal.mockResolvedValue([{ value: 6 }])

    await expect(new QueryClient().query(getCollectionStatsQuery())).resolves.toStrictEqual({
      active: 2,
      avgProducts: 2,
      draft: 1,
      total: 3,
    })
  })
})

describe("getCollections", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns the storefront rows untouched", async () => {
    operations.storefrontCollections.mockResolvedValue([{ handle: "srebro-925", id: "collection-1" }])

    await expect(getCollections()).resolves.toStrictEqual([{ handle: "srebro-925", id: "collection-1" }])
  })
})

describe("getCollectionsQuery", () => {
  it("caches the storefront list under the shared key", () => {
    const options = getCollectionsQuery()

    expect(options.queryKey).toStrictEqual(COLLECTION_QUERY_KEYS.ALL)
    expect(options.staleTime).toBe(COLLECTION_QUERY_STALE_MS)
  })
})

describe("getStorefrontCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("looks the collection up by the validated handle", async () => {
    const row = { descriptions: null, id: "collection-1", titles: { "en-US": "Silver 925", "pl-PL": "Srebro 925" } }
    operations.byHandle.mockResolvedValue(row)

    await expect(getStorefrontCollection({ data: "srebro-925" })).resolves.toBe(row)
    expect(operations.byHandle).toHaveBeenCalledExactlyOnceWith({ handle: "srebro-925" })
  })

  it("answers false for a handle that names no active collection", async () => {
    operations.byHandle.mockResolvedValue(undefined)

    await expect(getStorefrontCollection({ data: "missing" })).resolves.toBe(false)
  })

  it("rejects an empty handle before querying", async () => {
    await expect(getStorefrontCollection({ data: "" })).rejects.toThrow()
    expect(operations.byHandle).not.toHaveBeenCalled()
  })
})

describe("getStorefrontCollectionQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("keys the collection by its handle under the prefix a collection edit invalidates", () => {
    const { queryKey } = getStorefrontCollectionQuery("srebro-925")

    expect(queryKey).toStrictEqual(["collection", "srebro-925"])
    expect(STOREFRONT_REALTIME_QUERY_PREFIXES.some((prefix) => queryKeyPrefixesOverlap(prefix, queryKey))).toBe(true)
  })

  it("keeps the collection as fresh as the collection list", () => {
    expect(getStorefrontCollectionQuery("srebro-925").staleTime).toBe(COLLECTION_QUERY_STALE_MS)
  })

  it("caches a missing collection instead of failing the query", async () => {
    operations.byHandle.mockResolvedValue(undefined)
    const queryClient = new QueryClient()

    await expect(queryClient.query(getStorefrontCollectionQuery("missing"))).resolves.toBe(false)
    await queryClient.query(getStorefrontCollectionQuery("missing"))

    expect(operations.byHandle).toHaveBeenCalledExactlyOnceWith({ handle: "missing" })
  })
})

it("loads the admin collection cache including product counts", async () => {
  operations.adminCollections.mockResolvedValue([collectionRow("silver", { "en-US": "Silver", "pl-PL": "Srebro" })])
  operations.productCounts.mockResolvedValue([{ collectionId: "silver", count: 2 }])
  await expect(new QueryClient().query(getAdminCollectionsQuery())).resolves.toMatchObject([{ id: "silver", productCount: 2 }])
})

it("loads the storefront collection cache", async () => {
  operations.storefrontCollections.mockResolvedValue([{ handle: "silver", id: "silver" }])
  await expect(new QueryClient().query(getCollectionsQuery())).resolves.toStrictEqual([{ handle: "silver", id: "silver" }])
})
