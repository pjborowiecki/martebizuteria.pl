import { type SQL, isSQLWrapper } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  countChildCategories,
  deleteCategories,
  getCategoriesByIds,
  getNextRankForParent,
  setCategoryRanks,
} from "~/src/modules/product-category/product-category.server"

const access = vi.hoisted(() => ({
  batch: vi.fn<(statements: readonly unknown[]) => Promise<unknown[]>>(),
  deleteWhere: vi.fn<(condition: SQL | undefined) => Promise<void>>(),
  selectWhere: vi.fn<(condition: SQL | undefined) => Promise<Record<string, unknown>[]>>(),
  set: vi.fn<(values: { rank?: unknown }) => { where: (condition: SQL | undefined) => Promise<void> }>(),
  updateWhere: vi.fn<(condition: SQL | undefined) => Promise<void>>(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    batch: access.batch,
    delete: () => ({ where: access.deleteWhere }),
    query: {
      productCategory: {
        findFirst: () => ({ prepare: () => ({ execute: vi.fn() }) }),
        findMany: () => ({ prepare: () => ({ execute: vi.fn() }) }),
      },
    },
    select: () => ({ from: () => ({ prepare: () => ({ execute: vi.fn() }), where: access.selectWhere }) }),
    update: () => ({ set: access.set }),
  },
}))

const dialect = new SQLiteSyncDialect()

const query = (condition: SQL | undefined) => {
  if (condition === undefined) {
    throw new Error("expected a condition")
  }

  return dialect.sqlToQuery(condition)
}

describe("getNextRankForParent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.selectWhere.mockResolvedValue([])
  })

  it("starts a branch at rank zero when it has no categories yet", async () => {
    access.selectWhere.mockResolvedValue([{ value: null }])

    await expect(getNextRankForParent("category-parent")).resolves.toBe(0)
  })

  it("starts at rank zero when the query returns no row at all", async () => {
    await expect(getNextRankForParent("category-parent")).resolves.toBe(0)
  })

  it("appends after the highest rank of the branch", async () => {
    access.selectWhere.mockResolvedValue([{ value: 7 }])

    await expect(getNextRankForParent("category-parent")).resolves.toBe(8)
  })

  it("scopes the lookup to the chosen parent", async () => {
    await getNextRankForParent("category-parent")

    expect(query(access.selectWhere.mock.calls[0]?.[0])).toMatchObject({
      params: ["category-parent"],
      sql: '"product_category"."parent_id" = ?',
    })
  })

  it.each([
    ["no parent", undefined],
    ["an empty parent", ""],
  ])("ranks a root category among the other roots for %s", async (_label, parentId) => {
    await getNextRankForParent(parentId)

    expect(query(access.selectWhere.mock.calls[0]?.[0])).toMatchObject({
      params: [],
      sql: '"product_category"."parent_id" is null',
    })
  })
})

describe("countChildCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.selectWhere.mockResolvedValue([])
  })

  it("answers zero for an empty request without querying", async () => {
    await expect(countChildCategories([])).resolves.toBe(0)
    expect(access.selectWhere).not.toHaveBeenCalled()
  })

  it("returns the counted children", async () => {
    access.selectWhere.mockResolvedValue([{ value: 3 }])

    await expect(countChildCategories(["category-1"])).resolves.toBe(3)
  })

  it("treats a missing aggregate row as zero", async () => {
    await expect(countChildCategories(["category-1"])).resolves.toBe(0)
  })

  it("counts the children of every requested parent", async () => {
    await countChildCategories(["category-1", "category-2"])

    expect(query(access.selectWhere.mock.calls[0]?.[0])).toMatchObject({
      params: ['["category-1","category-2"]'],
      sql: '"product_category"."parent_id" in (select value from json_each(?))',
    })
  })
})

describe("getCategoriesByIds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.selectWhere.mockResolvedValue([])
  })

  it("answers an empty request without querying", async () => {
    await expect(getCategoriesByIds([])).resolves.toStrictEqual([])
    expect(access.selectWhere).not.toHaveBeenCalled()
  })

  it("asks for exactly the requested ids", async () => {
    await getCategoriesByIds(["category-1", "category-2"])

    expect(query(access.selectWhere.mock.calls[0]?.[0])).toMatchObject({
      params: ['["category-1","category-2"]'],
      sql: '"product_category"."id" in (select value from json_each(?))',
    })
  })
})

describe("setCategoryRanks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.updateWhere.mockResolvedValue()
    access.set.mockReturnValue({ where: access.updateWhere })
    access.batch.mockResolvedValue([])
  })

  it("does nothing for an empty reorder", async () => {
    await setCategoryRanks([])

    expect(access.set).not.toHaveBeenCalled()
  })

  it("writes every new rank in a single case expression", async () => {
    await setCategoryRanks([
      { id: "category-1", rank: 0 },
      { id: "category-2", rank: 1 },
    ])

    const rank = access.set.mock.calls[0]?.[0].rank
    if (!isSQLWrapper(rank)) {
      throw new Error("expected a sql rank expression")
    }

    expect(dialect.sqlToQuery(rank.getSQL())).toMatchObject({
      params: ["category-1", 0, "category-2", 1],
      sql: '(case when "product_category"."id" = ? then ? when "product_category"."id" = ? then ? end)',
    })
  })

  it("only updates the reordered categories", async () => {
    await setCategoryRanks([
      { id: "category-1", rank: 0 },
      { id: "category-2", rank: 1 },
    ])

    expect(query(access.updateWhere.mock.calls[0]?.[0])).toMatchObject({
      params: ['["category-1","category-2"]'],
      sql: '"product_category"."id" in (select value from json_each(?))',
    })
  })

  it("sends a long reorder as statements D1 accepts, together in one batch", async () => {
    await setCategoryRanks(Array.from({ length: 120 }, (_, rank) => ({ id: `category-${String(rank)}`, rank })))

    expect(access.set).toHaveBeenCalledTimes(3)
    expect(access.batch).toHaveBeenCalledTimes(1)
    expect(access.batch.mock.calls[0]?.[0]).toHaveLength(3)
  })
})

describe("deleteCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.deleteWhere.mockResolvedValue()
  })

  it("does nothing for an empty list", async () => {
    await deleteCategories([])

    expect(access.deleteWhere).not.toHaveBeenCalled()
  })

  it("deletes exactly the requested categories", async () => {
    await deleteCategories(["category-1", "category-2"])

    expect(query(access.deleteWhere.mock.calls[0]?.[0])).toMatchObject({
      params: ['["category-1","category-2"]'],
      sql: '"product_category"."id" in (select value from json_each(?))',
    })
  })
})
