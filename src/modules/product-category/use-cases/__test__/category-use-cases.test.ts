import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"
import { queryKeyPrefixesOverlap } from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"
import { STOREFRONT_REALTIME_QUERY_PREFIXES } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import {
  CATEGORY_MUTATION_KEYS,
  CATEGORY_QUERY_KEYS,
  CATEGORY_QUERY_STALE_MS,
} from "~/src/modules/product-category/product-category.constants"

import { createCategory } from "../create-category"
import { deleteCategories, deleteCategoriesMutation } from "../delete-categories"
import { getAdminCategories, getAdminCategoriesQuery } from "../get-admin-categories"
import { getCategories, getCategoriesQuery } from "../get-categories"
import { getCategoryStats, getCategoryStatsQuery } from "../get-category-stats"
import { getStorefrontCategory, getStorefrontCategoryQuery } from "../get-storefront-category"
import { reorderCategories, reorderCategoriesMutation } from "../reorder-categories"
import { updateCategory } from "../update-category"

const database = vi.hoisted(() => {
  const updateWhere = vi.fn(() => Promise.resolve(undefined))

  return {
    insertValues: vi.fn((values: Record<string, unknown>) => Promise.resolve(values)),
    updateSet: vi.fn((values: Record<string, unknown>) => ({ values, where: updateWhere })),
    updateWhere,
  }
})

const server = vi.hoisted(() => ({
  adminCategories: vi.fn(),
  categoryProductTotal: vi.fn(),
  categoryStatusCounts: vi.fn(),
  countChildCategories: vi.fn(),
  countProductsForCategories: vi.fn(),
  deleteCategories: vi.fn(),
  getCategoriesByIds: vi.fn(),
  getCategoryByHandle: vi.fn(),
  getNextRankForParent: vi.fn(),
  productCounts: vi.fn(),
  publishedCountsByRoot: vi.fn(),
  setCategoryRanks: vi.fn(),
  storefrontCategoryByHandle: vi.fn(),
  storefrontRoots: vi.fn(),
}))

const effects = vi.hoisted(() => ({
  created: vi.fn(),
  deleted: vi.fn(),
  invalidate: vi.fn(),
  updated: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}), withRequest: {} }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    insert: () => ({ values: database.insertValues }),
    update: () => ({ set: database.updateSet }),
  },
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleCategoryCatalogInvalidation: effects.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogCategoryCreatedAudit: effects.created,
  recordCatalogCategoryDeletedAudit: effects.deleted,
  recordCatalogCategoryUpdatedAudit: effects.updated,
}))
vi.mock("~/src/modules/category-on-product/category-on-product.accessors", () => ({
  countProductsForCategories: server.countProductsForCategories,
  getCategoryProductTotalQuery: { execute: server.categoryProductTotal },
  getProductCountsQuery: { execute: server.productCounts },
}))
vi.mock("~/src/modules/product-category/product-category.server", () => ({
  countChildCategories: server.countChildCategories,
  deleteCategories: server.deleteCategories,
  getAdminCategoriesQuery: { execute: server.adminCategories },
  getCategoriesByIds: server.getCategoriesByIds,
  getCategoryByHandleQuery: { execute: server.getCategoryByHandle },
  getCategoryStatusCountsQuery: { execute: server.categoryStatusCounts },
  getNextRankForParent: server.getNextRankForParent,
  getStorefrontCategoryByHandleQuery: { execute: server.storefrontCategoryByHandle },
  getStorefrontRootCategoriesQuery: { execute: server.storefrontRoots },
  setCategoryRanks: server.setCategoryRanks,
}))
vi.mock("~/src/modules/product/product.storefront-catalog.accessors", () => ({
  getPublishedProductCountsByRootCategory: server.publishedCountsByRoot,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) => handler({ data: options?.data }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        const validating = {
          handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) =>
            handler({ data: validate(options?.data) }),
          middleware: () => validating,
          validator: () => validating,
        }

        return validating
      },
    }

    return builder
  },
}))

const EMPTY_MAP = { "en-US": "", "pl-PL": "" }

const PARENT_ID = "01890000-0000-7000-8000-000000000001"

const CHILD_ID = "01890000-0000-7000-8000-000000000002"

const createInput = {
  descriptions: EMPTY_MAP,
  handle: "rings",
  image: "",
  parentId: "",
  shortDescriptions: EMPTY_MAP,
  status: "active" as const,
  subtitles: EMPTY_MAP,
  titles: { "en-US": " Rings ", "pl-PL": " Pierścionki " },
}

describe("createCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.getCategoryByHandle.mockResolvedValue(undefined)
    server.getNextRankForParent.mockResolvedValue(4)
  })

  it("trims the locale titles, ranks the category last and reports its new id", async () => {
    const result = await createCategory({ data: createInput })

    expect(database.insertValues).toHaveBeenCalledExactlyOnceWith({
      descriptions: undefined,
      handle: "rings",
      id: result.id,
      image: undefined,
      parentId: undefined,
      rank: 4,
      shortDescriptions: undefined,
      status: "active",
      subtitles: undefined,
      titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
    })
    expect(result.handle).toBe("rings")
    expect(result.id).toHaveLength(UUID_STRING_LENGTH)
  })

  it("refuses a handle another category already owns", async () => {
    server.getCategoryByHandle.mockResolvedValue({ id: "other" })

    await expect(createCategory({ data: createInput })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "DUPLICATE_HANDLE",
    })
    expect(database.insertValues).not.toHaveBeenCalled()
  })

  it("refuses a parent that does not exist", async () => {
    server.getCategoriesByIds.mockResolvedValue([])

    await expect(createCategory({ data: { ...createInput, parentId: PARENT_ID } })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "INVALID_PARENT",
    })
    expect(database.insertValues).not.toHaveBeenCalled()
  })

  it("ranks a child within its own parent", async () => {
    server.getCategoriesByIds.mockResolvedValue([{ id: PARENT_ID }])
    server.getNextRankForParent.mockResolvedValue(2)

    await createCategory({ data: { ...createInput, parentId: PARENT_ID } })

    expect(server.getNextRankForParent).toHaveBeenCalledExactlyOnceWith(PARENT_ID)
    expect(database.insertValues.mock.calls[0]?.[0]).toMatchObject({ parentId: PARENT_ID, rank: 2 })
  })

  it("stores the image only when one was supplied", async () => {
    await createCategory({ data: { ...createInput, image: "categories/rings.jpg" } })

    expect(database.insertValues.mock.calls[0]?.[0]).toMatchObject({ image: "categories/rings.jpg" })
  })

  it("refreshes the caches and records the audit entry after inserting", async () => {
    await createCategory({ data: createInput })

    expect(effects.invalidate).toHaveBeenCalledTimes(1)
    expect(effects.created).toHaveBeenCalledExactlyOnceWith("rings")
  })

  it.each([
    [{ ...createInput, handle: "Rings!" }],
    [{ ...createInput, titles: { "en-US": "Rings", "pl-PL": "  " } }],
    [{ ...createInput, parentId: "not-a-uuid" }],
  ])("refuses the invalid payload %j", (data) => {
    expect(() => {
      void createCategory({ data })
    }).toThrow()
    expect(database.insertValues).not.toHaveBeenCalled()
  })
})

describe("updateCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.getCategoryByHandle.mockResolvedValue(undefined)
    server.adminCategories.mockResolvedValue([])
  })

  it("writes the normalised locale maps against the category id", async () => {
    await expect(updateCategory({ data: { ...createInput, id: CHILD_ID } })).resolves.toStrictEqual({ handle: "rings", id: CHILD_ID })
    expect(database.updateSet).toHaveBeenCalledExactlyOnceWith({
      descriptions: undefined,
      handle: "rings",
      image: undefined,
      parentId: undefined,
      shortDescriptions: undefined,
      status: "active",
      subtitles: undefined,
      titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
    })
    expect(database.updateWhere).toHaveBeenCalledTimes(1)
  })

  it("lets a category keep its own handle", async () => {
    server.getCategoryByHandle.mockResolvedValue({ id: CHILD_ID })

    await expect(updateCategory({ data: { ...createInput, id: CHILD_ID } })).resolves.toMatchObject({ id: CHILD_ID })
  })

  it("refuses a handle another category already owns", async () => {
    server.getCategoryByHandle.mockResolvedValue({ id: PARENT_ID })

    await expect(updateCategory({ data: { ...createInput, id: CHILD_ID } })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "DUPLICATE_HANDLE",
    })
    expect(database.updateSet).not.toHaveBeenCalled()
  })

  it("refuses to make a category its own parent", async () => {
    await expect(updateCategory({ data: { ...createInput, id: CHILD_ID, parentId: CHILD_ID } })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "INVALID_PARENT",
    })
    expect(server.adminCategories).not.toHaveBeenCalled()
  })

  it("refuses a parent that does not exist", async () => {
    server.adminCategories.mockResolvedValue([{ id: CHILD_ID, parentId: null }])

    await expect(updateCategory({ data: { ...createInput, id: CHILD_ID, parentId: PARENT_ID } })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "INVALID_PARENT",
    })
  })

  it("refuses a parent that is one of the category's own descendants", async () => {
    server.adminCategories.mockResolvedValue([
      { id: CHILD_ID, parentId: null },
      { id: PARENT_ID, parentId: CHILD_ID },
    ])

    await expect(updateCategory({ data: { ...createInput, id: CHILD_ID, parentId: PARENT_ID } })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "INVALID_PARENT",
    })
    expect(database.updateSet).not.toHaveBeenCalled()
  })

  it("accepts a parent outside the category's own subtree", async () => {
    server.adminCategories.mockResolvedValue([
      { id: CHILD_ID, parentId: null },
      { id: PARENT_ID, parentId: null },
    ])

    await updateCategory({ data: { ...createInput, id: CHILD_ID, parentId: PARENT_ID } })

    expect(database.updateSet.mock.calls[0]?.[0]).toMatchObject({ parentId: PARENT_ID })
  })

  it("refreshes the caches and records the audit entry after updating", async () => {
    await updateCategory({ data: { ...createInput, id: CHILD_ID } })

    expect(effects.invalidate).toHaveBeenCalledTimes(1)
    expect(effects.updated).toHaveBeenCalledExactlyOnceWith("rings")
  })
})

describe("deleteCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.countChildCategories.mockResolvedValue(0)
    server.countProductsForCategories.mockResolvedValue(0)
  })

  it("deletes the ids and reports how many were removed", async () => {
    await expect(deleteCategories({ data: [CHILD_ID, PARENT_ID] })).resolves.toStrictEqual({ deleted: 2, ok: true })
    expect(server.deleteCategories).toHaveBeenCalledExactlyOnceWith([CHILD_ID, PARENT_ID])
    expect(effects.invalidate).toHaveBeenCalledTimes(1)
    expect(effects.deleted).toHaveBeenCalledExactlyOnceWith(`${CHILD_ID}, ${PARENT_ID}`)
  })

  it("refuses to delete a category that still has children", async () => {
    server.countChildCategories.mockResolvedValue(1)

    await expect(deleteCategories({ data: [PARENT_ID] })).rejects.toMatchObject({ code: "CONFLICT", message: "HAS_CHILDREN" })
    expect(server.countProductsForCategories).not.toHaveBeenCalled()
    expect(server.deleteCategories).not.toHaveBeenCalled()
  })

  it("refuses to delete a category that still holds products", async () => {
    server.countProductsForCategories.mockResolvedValue(3)

    await expect(deleteCategories({ data: [CHILD_ID] })).rejects.toMatchObject({ code: "CONFLICT", message: "HAS_PRODUCTS" })
    expect(server.deleteCategories).not.toHaveBeenCalled()
  })

  it("refuses an empty selection", () => {
    expect(() => {
      void deleteCategories({ data: [] })
    }).toThrow()
    expect(server.countChildCategories).not.toHaveBeenCalled()
  })

  it("exposes the delete mutation under its own key", () => {
    expect(deleteCategoriesMutation.mutationKey).toStrictEqual(CATEGORY_MUTATION_KEYS.DELETE)
  })
})

describe("reorderCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ranks the known ids within their own parent group", async () => {
    server.adminCategories.mockResolvedValue([
      { id: "a", parentId: null },
      { id: "b", parentId: null },
      { id: "c", parentId: "a" },
    ])

    await expect(reorderCategories({ data: ["b", "a", "c"] })).resolves.toStrictEqual({ ok: true })
    expect(server.setCategoryRanks).toHaveBeenCalledExactlyOnceWith([
      { id: "b", rank: 0 },
      { id: "a", rank: 1 },
      { id: "c", rank: 0 },
    ])
  })

  it("ignores ids the admin list does not know", async () => {
    server.adminCategories.mockResolvedValue([{ id: "a", parentId: null }])

    await reorderCategories({ data: ["ghost", "a"] })

    expect(server.setCategoryRanks).toHaveBeenCalledExactlyOnceWith([{ id: "a", rank: 0 }])
  })

  it("refreshes the caches after saving the order", async () => {
    server.adminCategories.mockResolvedValue([{ id: "a", parentId: null }])

    await reorderCategories({ data: ["a"] })

    expect(effects.invalidate).toHaveBeenCalledTimes(1)
  })

  it("exposes the reorder mutation under its own key", () => {
    expect(reorderCategoriesMutation.mutationKey).toStrictEqual(CATEGORY_MUTATION_KEYS.REORDER)
  })

  it("saves the order handed to the reorder mutation", async () => {
    server.adminCategories.mockResolvedValue([
      { id: "a", parentId: null },
      { id: "b", parentId: null },
    ])

    await reorderCategoriesMutation.mutationFn?.(["b", "a"], { client: new QueryClient(), meta: undefined })

    expect(server.setCategoryRanks).toHaveBeenCalledExactlyOnceWith([
      { id: "b", rank: 0 },
      { id: "a", rank: 1 },
    ])
  })
})

describe("getAdminCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("attaches the product count and the parent titles to each row", async () => {
    server.adminCategories.mockResolvedValue([
      { handle: "jewellery", id: PARENT_ID, parentId: null, titles: { "en-US": "Jewellery", "pl-PL": "Biżuteria" } },
      { handle: "rings", id: CHILD_ID, parentId: PARENT_ID, titles: { "en-US": "Rings", "pl-PL": "Pierścionki" } },
    ])
    server.productCounts.mockResolvedValue([{ categoryId: CHILD_ID, count: 7 }])

    const rows = await getAdminCategories()

    expect(rows[0]).toMatchObject({ id: PARENT_ID, parentTitles: undefined, productCount: 0 })
    expect(rows[1]).toMatchObject({
      id: CHILD_ID,
      parentTitles: { "en-US": "Jewellery", "pl-PL": "Biżuteria" },
      productCount: 7,
    })
  })

  it("fills a locale the stored titles are missing", async () => {
    server.adminCategories.mockResolvedValue([{ handle: "rings", id: CHILD_ID, parentId: null, titles: { "pl-PL": "Pierścionki" } }])
    server.productCounts.mockResolvedValue([])

    const rows = await getAdminCategories()

    expect(rows[0]?.titles).toStrictEqual({ "en-US": "", "pl-PL": "Pierścionki" })
  })

  it("caches the admin list under its own key", () => {
    expect(getAdminCategoriesQuery().queryKey).toStrictEqual(CATEGORY_QUERY_KEYS.ADMIN.ALL)
  })
})

describe("getCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps only the active children, ordered by rank, and counts published products", async () => {
    server.storefrontRoots.mockResolvedValue([
      {
        children: [
          { id: "c2", rank: 2, status: "active" },
          { id: "c1", rank: 1, status: "active" },
          { id: "c3", rank: 0, status: "draft" },
        ],
        id: PARENT_ID,
      },
    ])
    server.publishedCountsByRoot.mockResolvedValue([{ categoryId: PARENT_ID, count: 11 }])

    const roots = await getCategories()

    expect(roots[0]).toMatchObject({ children: [{ id: "c1" }, { id: "c2" }], productCount: 11 })
  })

  it("counts a root with no published products as zero", async () => {
    server.storefrontRoots.mockResolvedValue([{ children: [], id: PARENT_ID }])
    server.publishedCountsByRoot.mockResolvedValue([])

    const roots = await getCategories()

    expect(roots[0]).toMatchObject({ productCount: 0 })
  })

  it("caches the storefront list under its own key", () => {
    expect(getCategoriesQuery().queryKey).toStrictEqual(CATEGORY_QUERY_KEYS.ALL)
  })
})

describe("getCategoryStats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("averages the products across every category", async () => {
    server.categoryStatusCounts.mockResolvedValue([{ active: 3, draft: 1, total: 4 }])
    server.categoryProductTotal.mockResolvedValue([{ value: 10 }])

    await expect(getCategoryStats()).resolves.toStrictEqual({ active: 3, avgProducts: 2.5, draft: 1, total: 4 })
  })

  it("reports zeroes when there are no categories at all", async () => {
    server.categoryStatusCounts.mockResolvedValue([])
    server.categoryProductTotal.mockResolvedValue([])

    await expect(getCategoryStats()).resolves.toStrictEqual({ active: 0, avgProducts: 0, draft: 0, total: 0 })
  })

  it("caches the stats under their own key", () => {
    expect(getCategoryStatsQuery().queryKey).toStrictEqual(CATEGORY_QUERY_KEYS.ADMIN.STATS)
  })
})

describe("getStorefrontCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("looks the category up by the handle it was asked for", async () => {
    const row = { descriptions: null, id: CHILD_ID, titles: { "en-US": "Rings", "pl-PL": "Pierścionki" } }
    server.storefrontCategoryByHandle.mockResolvedValue(row)

    await expect(getStorefrontCategory({ data: "rings" })).resolves.toBe(row)
    expect(server.storefrontCategoryByHandle).toHaveBeenCalledExactlyOnceWith({ handle: "rings" })
  })

  it("answers false for a handle that names no active category", async () => {
    server.storefrontCategoryByHandle.mockResolvedValue(undefined)

    await expect(getStorefrontCategory({ data: "missing" })).resolves.toBe(false)
  })

  it("refuses an empty handle before querying", () => {
    expect(() => {
      void getStorefrontCategory({ data: "" })
    }).toThrow()
    expect(server.storefrontCategoryByHandle).not.toHaveBeenCalled()
  })
})

describe("getStorefrontCategoryQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keys the category by its handle under the prefix a category edit invalidates", () => {
    const { queryKey } = getStorefrontCategoryQuery("rings")

    expect(queryKey).toStrictEqual(["category", "rings"])
    expect(STOREFRONT_REALTIME_QUERY_PREFIXES.some((prefix) => queryKeyPrefixesOverlap(prefix, queryKey))).toBe(true)
  })

  it("keeps the category as fresh as the category list", () => {
    expect(getStorefrontCategoryQuery("rings").staleTime).toBe(CATEGORY_QUERY_STALE_MS)
  })

  it("caches a missing category instead of failing the query", async () => {
    server.storefrontCategoryByHandle.mockResolvedValue(undefined)
    const queryClient = new QueryClient()

    await expect(queryClient.query(getStorefrontCategoryQuery("missing"))).resolves.toBe(false)
    await queryClient.query(getStorefrontCategoryQuery("missing"))

    expect(server.storefrontCategoryByHandle).toHaveBeenCalledExactlyOnceWith({ handle: "missing" })
  })
})

it("loads storefront categories and their counts through the query cache", async () => {
  server.storefrontRoots.mockResolvedValue([{ children: [], id: PARENT_ID }])
  server.publishedCountsByRoot.mockResolvedValue([{ categoryId: PARENT_ID, count: 5 }])
  await expect(new QueryClient().query(getCategoriesQuery())).resolves.toMatchObject([{ id: PARENT_ID, productCount: 5 }])
})
it("loads category statistics through the query cache", async () => {
  server.categoryStatusCounts.mockResolvedValue([{ active: 2, draft: 0, total: 2 }])
  server.categoryProductTotal.mockResolvedValue([{ value: 7 }])
  await expect(new QueryClient().query(getCategoryStatsQuery())).resolves.toStrictEqual({ active: 2, avgProducts: 3.5, draft: 0, total: 2 })
})
it("deletes categories through the mutation after checking their dependencies", async () => {
  server.countChildCategories.mockResolvedValue(0)
  server.countProductsForCategories.mockResolvedValue(0)
  await expect(deleteCategoriesMutation.mutationFn?.([CHILD_ID], { client: new QueryClient(), meta: undefined })).resolves.toStrictEqual({
    deleted: 1,
    ok: true,
  })
  expect(server.deleteCategories).toHaveBeenLastCalledWith([CHILD_ID])
})
it("retains a supplied image when updating a category", async () => {
  server.getCategoryByHandle.mockResolvedValue(undefined)
  await updateCategory({ data: { ...createInput, id: CHILD_ID, image: "categories/rings.jpg" } })
  expect(database.updateSet).toHaveBeenLastCalledWith(expect.objectContaining({ image: "categories/rings.jpg" }))
})
