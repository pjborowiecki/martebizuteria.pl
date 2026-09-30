import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const adminList = vi.hoisted(() => ({
  aggregates: vi.fn(),
  catalogList: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/modules/product/product.admin-list.server", () => ({
  getAdminProductsCatalogList: adminList.catalogList,
  loadAdminListAggregates: adminList.aggregates,
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

import {
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_QUERY_KEYS,
  PRODUCT_QUERY_STALE_MS,
  PRODUCT_STATUS,
} from "~/src/modules/product/product.constants"
import { type AdminProductListRow } from "~/src/modules/product/product.utils"
import { getAdminProducts, getAdminProductsQuery } from "~/src/modules/product/use-cases/get-admin-products"

const NOW = new Date("2026-03-14T10:00:00.000Z")

const RING_ID = "product-ring"

const NECKLACE_ID = "product-necklace"

const listRow = (id: string, overrides: Partial<AdminProductListRow> = {}): AdminProductListRow => ({
  attributes: [],
  categories: [],
  collections: [],
  createdAt: NOW,
  descriptions: null,
  handle: `handle-${id}`,
  id,
  metadata: null,
  primaryCategoryId: null,
  rank: 0,
  status: PRODUCT_STATUS.PUBLISHED,
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  updatedAt: NOW,
  ...overrides,
})

const noAggregates = () => ({
  skuSummaryByProductId: new Map<string, string>(),
  statsByProductId: new Map<string, { minPrice: number | undefined; totalStock: number; variantCount: number }>(),
})

beforeEach(() => {
  vi.clearAllMocks()
  adminList.catalogList.mockResolvedValue([])
  adminList.aggregates.mockResolvedValue(noAggregates())
})

describe("getAdminProducts", () => {
  it("returns nothing while the catalogue has no product", async () => {
    await expect(getAdminProducts()).resolves.toStrictEqual([])
  })

  it("keeps the order the catalogue list came back in", async () => {
    adminList.catalogList.mockResolvedValue([listRow(RING_ID), listRow(NECKLACE_ID)])

    const items = await getAdminProducts()

    expect(items.map((item) => item.id)).toStrictEqual([RING_ID, NECKLACE_ID])
  })

  it("aggregates variants, stock and lowest price onto the product they belong to", async () => {
    adminList.catalogList.mockResolvedValue([listRow(RING_ID)])
    adminList.aggregates.mockResolvedValue({
      skuSummaryByProductId: new Map([[RING_ID, "MAR-RING-001"]]),
      statsByProductId: new Map([[RING_ID, { minPrice: 12_000, totalStock: 24, variantCount: 3 }]]),
    })

    const items = await getAdminProducts()

    expect(items[0]).toMatchObject({
      inventoryLevel: PRODUCT_INVENTORY_LEVEL.OK,
      minPrice: 12_000,
      skuSummary: "MAR-RING-001",
      totalStock: 24,
      variantCount: 3,
    })
  })

  it("treats a product with no aggregate row as sold out with no variants", async () => {
    adminList.catalogList.mockResolvedValue([listRow(RING_ID)])

    const items = await getAdminProducts()

    expect(items[0]).toMatchObject({ inventoryLevel: PRODUCT_INVENTORY_LEVEL.OUT, totalStock: 0, variantCount: 0 })
    expect(items[0]?.minPrice).toBeUndefined()
    expect(items[0]?.skuSummary).toBeUndefined()
  })

  it("loads the aggregates for exactly the products it listed", async () => {
    const rows = [listRow(RING_ID), listRow(NECKLACE_ID)]
    adminList.catalogList.mockResolvedValue(rows)

    await getAdminProducts()

    expect(adminList.aggregates).toHaveBeenCalledWith(rows)
  })
})

describe("getAdminProductsQuery", () => {
  it("caches the admin list under its own key and does not refetch on mount", () => {
    const options = getAdminProductsQuery()

    expect(options.queryKey).toStrictEqual(PRODUCT_QUERY_KEYS.ADMIN.ALL)
    expect(options.staleTime).toBe(PRODUCT_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches the admin list into the cache", async () => {
    adminList.catalogList.mockResolvedValue([listRow(RING_ID)])
    const queryClient = new QueryClient()

    await queryClient.query(getAdminProductsQuery())

    expect(queryClient.getQueryData(PRODUCT_QUERY_KEYS.ADMIN.ALL)).toMatchObject([{ id: RING_ID }])
  })
})
