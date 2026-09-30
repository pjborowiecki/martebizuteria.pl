import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({
  categories: vi.fn(),
  productCounts: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/modules/category-on-product/category-on-product.accessors", () => ({
  getProductCountsQuery: { execute: accessors.productCounts },
}))
vi.mock("~/src/modules/product-category/product-category.server", () => ({
  getAdminCategoriesQuery: { execute: accessors.categories },
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

import { CATEGORY_QUERY_KEYS, CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"
import { getAdminCategories, getAdminCategoriesQuery } from "~/src/modules/product-category/use-cases/get-admin-categories"

const TIMESTAMP = new Date("2024-01-01T00:00:00.000Z")

const categoryRow = (overrides: Record<string, unknown> = {}) => ({
  createdAt: TIMESTAMP,
  descriptions: null,
  handle: "rings",
  id: "category-1",
  image: null,
  metadata: null,
  parentId: null,
  rank: 1,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
  updatedAt: TIMESTAMP,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  accessors.categories.mockResolvedValue([])
  accessors.productCounts.mockResolvedValue([])
})

describe("getAdminCategories", () => {
  it("returns nothing while the catalogue has no categories", async () => {
    await expect(getAdminCategories()).resolves.toStrictEqual([])
  })

  it("attaches the product count that belongs to each category", async () => {
    accessors.categories.mockResolvedValue([categoryRow(), categoryRow({ handle: "necklaces", id: "category-2" })])
    accessors.productCounts.mockResolvedValue([
      { categoryId: "category-2", count: 4 },
      { categoryId: "category-1", count: 11 },
    ])

    const items = await getAdminCategories()

    expect(items.map((item) => [item.id, item.productCount])).toStrictEqual([
      ["category-1", 11],
      ["category-2", 4],
    ])
  })

  it("treats a category nobody has filled as empty", async () => {
    accessors.categories.mockResolvedValue([categoryRow()])

    await expect(getAdminCategories()).resolves.toMatchObject([{ productCount: 0 }])
  })

  it("resolves the parent titles from the same page of categories", async () => {
    accessors.categories.mockResolvedValue([
      categoryRow(),
      categoryRow({ handle: "engagement", id: "category-2", parentId: "category-1", titles: { "en-US": "Engagement" } }),
    ])

    const items = await getAdminCategories()

    expect(items[1]?.parentTitles).toStrictEqual({ "en-US": "Rings", "pl-PL": "Pierścionki" })
  })

  it("leaves a root category without parent titles", async () => {
    accessors.categories.mockResolvedValue([categoryRow()])

    const items = await getAdminCategories()

    expect(items[0]?.parentTitles).toBeUndefined()
  })

  it("treats an empty parent id as no parent at all", async () => {
    accessors.categories.mockResolvedValue([categoryRow({ parentId: "" })])

    const items = await getAdminCategories()

    expect(items[0]?.parentTitles).toBeUndefined()
  })

  it("leaves the parent titles unset when the parent is not on this page", async () => {
    accessors.categories.mockResolvedValue([categoryRow({ parentId: "category-missing" })])

    const items = await getAdminCategories()

    expect(items[0]?.parentTitles).toBeUndefined()
  })

  it("fills in the missing locales of a partially translated title", async () => {
    accessors.categories.mockResolvedValue([categoryRow({ titles: { "pl-PL": "Pierścionki" } })])

    const items = await getAdminCategories()

    expect(items[0]?.titles).toStrictEqual({ "en-US": "", "pl-PL": "Pierścionki" })
  })

  it("keeps the stored row beside the derived fields", async () => {
    accessors.categories.mockResolvedValue([categoryRow()])

    const items = await getAdminCategories()

    expect(items[0]).toMatchObject({ handle: "rings", rank: 1, status: "active" })
  })
})

describe("getAdminCategoriesQuery", () => {
  it("caches the admin list under its own key and does not refetch on mount", () => {
    const options = getAdminCategoriesQuery()

    expect(options.queryKey).toStrictEqual(CATEGORY_QUERY_KEYS.ADMIN.ALL)
    expect(options.staleTime).toBe(CATEGORY_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

it("loads category counts through the admin cache query", async () => {
  accessors.categories.mockResolvedValue([categoryRow()])
  accessors.productCounts.mockResolvedValue([{ categoryId: "category-1", count: 7 }])
  await expect(new QueryClient().query(getAdminCategoriesQuery())).resolves.toMatchObject([{ id: "category-1", productCount: 7 }])
  expect(accessors.categories).toHaveBeenCalledOnce()
})
