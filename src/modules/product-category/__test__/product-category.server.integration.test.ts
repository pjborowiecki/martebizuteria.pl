import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const { productCategory } = await import("~/src/modules/product-category/product-category.schema")
const {
  countChildCategories,
  deleteCategories,
  getAdminCategoriesQuery,
  getCategoriesByIds,
  getCategoryByHandleQuery,
  getCategoryHierarchyQuery,
  getCategoryStatusCountsQuery,
  getNextRankForParent,
  getStorefrontCategoryByHandleQuery,
  getStorefrontRootCategoriesQuery,
  setCategoryRanks,
} = await import("~/src/modules/product-category/product-category.server")

const { createTables } = await import("~/src/modules/product/__test__/product-sqlite-schema")

const NOW = 1_770_000_000_000

const insertCategory = (input: {
  createdAt?: number
  handle: string
  id: string
  parentId?: string | null
  rank?: number
  status?: "active" | "draft"
}): void => {
  sqlite
    .prepare(
      `insert into product_category (id, handle, parent_id, rank, status, titles, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.handle,
      input.parentId ?? null,
      input.rank ?? 0,
      input.status ?? "draft",
      JSON.stringify({ "en-US": input.handle, "pl-PL": input.handle }),
      input.createdAt ?? NOW,
      NOW,
    )
}

const idsOf = (rows: readonly { readonly id: string }[]): string[] => rows.map((row) => row.id)

beforeEach(() => {
  createTables(sqlite, [productCategory])
  insertCategory({ handle: "rings", id: "root-1", rank: 0, status: "active" })
  insertCategory({ handle: "chains", id: "root-2", rank: 1, status: "draft" })
  insertCategory({ handle: "signet-rings", id: "child-1", parentId: "root-1", rank: 0, status: "active" })
  insertCategory({ handle: "band-rings", id: "child-2", parentId: "root-1", rank: 1, status: "draft" })
})

afterAll(() => {
  sqlite.close()
})

describe("getAdminCategoriesQuery", () => {
  it("orders by rank and then by the newest first", async () => {
    insertCategory({ createdAt: NOW + 1000, handle: "newest-root", id: "root-3", rank: 0 })

    await expect(getAdminCategoriesQuery.execute().then(idsOf)).resolves.toStrictEqual(["root-3", "root-1", "child-1", "root-2", "child-2"])
  })
})

describe("getCategoryByHandleQuery", () => {
  it("loads a category with its parent and children whatever its status", async () => {
    const row = await getCategoryByHandleQuery.execute({ handle: "rings" })

    expect(row?.id).toBe("root-1")
    expect(row?.parent).toBeNull()
    expect(idsOf(row?.children ?? []).toSorted()).toStrictEqual(["child-1", "child-2"])
  })

  it("names the parent of a child category", async () => {
    const row = await getCategoryByHandleQuery.execute({ handle: "band-rings" })

    expect(row?.parent?.handle).toBe("rings")
    expect(row?.children).toStrictEqual([])
  })

  it("returns nothing for an unknown handle", async () => {
    await expect(getCategoryByHandleQuery.execute({ handle: "missing" })).resolves.toBeUndefined()
  })
})

describe("getStorefrontRootCategoriesQuery", () => {
  it("returns only active top level categories in rank order, with their children", async () => {
    insertCategory({ handle: "earrings", id: "root-4", rank: 2, status: "active" })

    const rows = await getStorefrontRootCategoriesQuery.execute()

    expect(idsOf(rows)).toStrictEqual(["root-1", "root-4"])
    expect(idsOf(rows[0]?.children ?? []).toSorted()).toStrictEqual(["child-1", "child-2"])
  })
})

describe("getStorefrontCategoryByHandleQuery", () => {
  it("serves an active category with its parent", async () => {
    const row = await getStorefrontCategoryByHandleQuery.execute({ handle: "signet-rings" })

    expect(row?.id).toBe("child-1")
    expect(row?.parent?.handle).toBe("rings")
  })

  it("refuses a draft category", async () => {
    await expect(getStorefrontCategoryByHandleQuery.execute({ handle: "chains" })).resolves.toBeUndefined()
  })
})

describe("getCategoryHierarchyQuery", () => {
  it("returns every id with its parent id", async () => {
    const rows = await getCategoryHierarchyQuery.execute()

    expect(rows.toSorted((left, right) => left.id.localeCompare(right.id))).toStrictEqual([
      { id: "child-1", parentId: "root-1" },
      { id: "child-2", parentId: "root-1" },
      { id: "root-1", parentId: null },
      { id: "root-2", parentId: null },
    ])
  })
})

describe("getCategoryStatusCountsQuery", () => {
  it("counts the active and draft categories", async () => {
    await expect(getCategoryStatusCountsQuery.execute()).resolves.toStrictEqual([{ active: 2, draft: 2, total: 4 }])
  })
})

describe("getNextRankForParent", () => {
  it("continues after the last top level rank when no parent is given", async () => {
    await expect(getNextRankForParent(undefined)).resolves.toBe(2)
  })

  it("treats an empty parent id as the top level", async () => {
    await expect(getNextRankForParent("")).resolves.toBe(2)
  })

  it("continues after the last sibling under a parent", async () => {
    await expect(getNextRankForParent("root-1")).resolves.toBe(2)
  })

  it("starts at zero for a parent with no children yet", async () => {
    await expect(getNextRankForParent("root-2")).resolves.toBe(0)
  })
})

describe("countChildCategories", () => {
  it("counts the children of the given parents", async () => {
    await expect(countChildCategories(["root-1"])).resolves.toBe(2)
    await expect(countChildCategories(["root-1", "root-2"])).resolves.toBe(2)
  })

  it("counts nothing for a parent without children", async () => {
    await expect(countChildCategories(["root-2"])).resolves.toBe(0)
  })

  it("skips the database for an empty parent list", async () => {
    await expect(countChildCategories([])).resolves.toBe(0)
  })
})

describe("getCategoriesByIds", () => {
  it("returns the full rows of the requested ids", async () => {
    const rows = await getCategoriesByIds(["root-1", "child-2"])

    expect(idsOf(rows).toSorted()).toStrictEqual(["child-2", "root-1"])
    expect(rows.find((row) => row.id === "root-1")?.titles["en-US"]).toBe("rings")
  })

  it("resolves to nothing for an empty id list", async () => {
    await expect(getCategoriesByIds([])).resolves.toStrictEqual([])
  })
})

describe("setCategoryRanks", () => {
  it("writes each new rank and leaves the rest untouched", async () => {
    await setCategoryRanks([
      { id: "root-1", rank: 5 },
      { id: "root-2", rank: 4 },
    ])

    const rows = await getCategoriesByIds(["root-1", "root-2", "child-1"])

    expect(rows.map((row) => ({ id: row.id, rank: row.rank })).toSorted((left, right) => left.id.localeCompare(right.id))).toStrictEqual([
      { id: "child-1", rank: 0 },
      { id: "root-1", rank: 5 },
      { id: "root-2", rank: 4 },
    ])
  })

  it("skips the database for an empty update", async () => {
    await setCategoryRanks([])

    const [row] = await getCategoriesByIds(["root-1"])

    expect(row?.rank).toBe(0)
  })
})

describe("deleteCategories", () => {
  it("removes the named categories and detaches their children", async () => {
    await deleteCategories(["root-1"])

    const rows = await getCategoryHierarchyQuery.execute()

    expect(rows.toSorted((left, right) => left.id.localeCompare(right.id))).toStrictEqual([
      { id: "child-1", parentId: null },
      { id: "child-2", parentId: null },
      { id: "root-2", parentId: null },
    ])
  })

  it("touches nothing for an empty selection", async () => {
    await deleteCategories([])

    await expect(getCategoryHierarchyQuery.execute()).resolves.toHaveLength(4)
  })
})

describe("a full admin page of categories", () => {
  const ids = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => `bulk-${String(index).padStart(3, "0")}`)

  beforeEach(() => {
    for (const id of ids) {
      insertCategory({ handle: id, id, parentId: "root-2" })
    }
  })

  it("reorders every category in one save", async () => {
    await setCategoryRanks(ids.map((id, index) => ({ id, rank: ids.length - index })))

    const rows = await getCategoriesByIds(ids)

    expect(idsOf(rows.toSorted((left, right) => left.rank - right.rank))).toStrictEqual(ids.toReversed())
  })

  it("counts the children of every selected parent", async () => {
    await expect(countChildCategories([...ids, "root-2"])).resolves.toBe(LIST_PAGE_SIZE_MAX)
  })

  it("deletes every selected category", async () => {
    await deleteCategories(ids)

    await expect(getCategoryHierarchyQuery.execute()).resolves.toHaveLength(4)
  })
})
