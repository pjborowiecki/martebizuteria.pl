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

const { productCollection } = await import("~/src/modules/product-collection/product-collection.schema")
const {
  deleteCollections,
  getAdminCollectionsQuery,
  getCollectionByHandleQuery,
  getCollectionStatusCountsQuery,
  getMaxRankQuery,
  getStorefrontCollectionByHandleQuery,
  getStorefrontCollectionsQuery,
  setCollectionRanks,
} = await import("~/src/modules/product-collection/product-collection.server")

const { createTables } = await import("~/src/modules/product/__test__/product-sqlite-schema")

const NOW = 1_770_000_000_000

const insertCollection = (input: { createdAt?: number; handle: string; id: string; rank?: number; status?: "active" | "draft" }): void => {
  sqlite
    .prepare(
      `insert into product_collection (id, handle, rank, status, titles, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.handle,
      input.rank ?? 0,
      input.status ?? "draft",
      JSON.stringify({ "en-US": input.handle, "pl-PL": input.handle }),
      input.createdAt ?? NOW,
      NOW,
    )
}

const idsOf = (rows: readonly { readonly id: string }[]): string[] => rows.map((row) => row.id)

beforeEach(() => {
  createTables(sqlite, [productCollection])
  insertCollection({ handle: "nowosci", id: "col-1", rank: 0, status: "active" })
  insertCollection({ handle: "sale", id: "col-2", rank: 1, status: "draft" })
  insertCollection({ handle: "bestsellers", id: "col-3", rank: 2, status: "active" })
})

afterAll(() => {
  sqlite.close()
})

describe("getAdminCollectionsQuery", () => {
  it("orders by rank and then by the newest first", async () => {
    insertCollection({ createdAt: NOW + 1000, handle: "newest", id: "col-4", rank: 0 })

    await expect(getAdminCollectionsQuery.execute().then(idsOf)).resolves.toStrictEqual(["col-4", "col-1", "col-2", "col-3"])
  })
})

describe("getCollectionByHandleQuery", () => {
  it("loads a collection whatever its status", async () => {
    const row = await getCollectionByHandleQuery.execute({ handle: "sale" })

    expect(row?.id).toBe("col-2")
    expect(row?.titles["en-US"]).toBe("sale")
  })

  it("returns nothing for an unknown handle", async () => {
    await expect(getCollectionByHandleQuery.execute({ handle: "missing" })).resolves.toBeUndefined()
  })
})

describe("getStorefrontCollectionsQuery", () => {
  it("returns only the active collections in rank order", async () => {
    await expect(getStorefrontCollectionsQuery.execute().then(idsOf)).resolves.toStrictEqual(["col-1", "col-3"])
  })
})

describe("getStorefrontCollectionByHandleQuery", () => {
  it("serves an active collection", async () => {
    await expect(getStorefrontCollectionByHandleQuery.execute({ handle: "bestsellers" })).resolves.toMatchObject({ id: "col-3" })
  })

  it("refuses a draft collection", async () => {
    await expect(getStorefrontCollectionByHandleQuery.execute({ handle: "sale" })).resolves.toBeUndefined()
  })
})

describe("getMaxRankQuery", () => {
  it("reports the highest rank in use", async () => {
    await expect(getMaxRankQuery.execute()).resolves.toStrictEqual([{ value: 2 }])
  })
})

describe("getCollectionStatusCountsQuery", () => {
  it("counts the active and draft collections", async () => {
    await expect(getCollectionStatusCountsQuery.execute()).resolves.toStrictEqual([{ active: 2, draft: 1, total: 3 }])
  })
})

describe("setCollectionRanks", () => {
  it("writes each new rank and leaves the rest untouched", async () => {
    await setCollectionRanks([
      { id: "col-1", rank: 9 },
      { id: "col-3", rank: 8 },
    ])

    const rows = await getAdminCollectionsQuery.execute()

    expect(rows.map((row) => ({ id: row.id, rank: row.rank }))).toStrictEqual([
      { id: "col-2", rank: 1 },
      { id: "col-3", rank: 8 },
      { id: "col-1", rank: 9 },
    ])
  })

  it("skips the database for an empty update", async () => {
    await setCollectionRanks([])

    await expect(getMaxRankQuery.execute()).resolves.toStrictEqual([{ value: 2 }])
  })
})

describe("deleteCollections", () => {
  it("removes only the named collections", async () => {
    await deleteCollections(["col-1", "col-3"])

    await expect(getAdminCollectionsQuery.execute().then(idsOf)).resolves.toStrictEqual(["col-2"])
  })

  it("touches nothing for an empty selection", async () => {
    await deleteCollections([])

    await expect(getAdminCollectionsQuery.execute()).resolves.toHaveLength(3)
  })
})

describe("a full admin page of collections", () => {
  const ids = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => `bulk-${String(index).padStart(3, "0")}`)

  beforeEach(() => {
    for (const id of ids) {
      insertCollection({ handle: id, id, rank: 3 })
    }
  })

  it("reorders every collection in one save", async () => {
    await setCollectionRanks(ids.map((id, index) => ({ id, rank: ids.length * 2 - index })))

    await expect(getAdminCollectionsQuery.execute().then(idsOf)).resolves.toStrictEqual(["col-1", "col-2", "col-3", ...ids.toReversed()])
  })

  it("deletes every selected collection", async () => {
    await deleteCollections(ids)

    await expect(getAdminCollectionsQuery.execute().then(idsOf)).resolves.toStrictEqual(["col-1", "col-2", "col-3"])
  })
})
