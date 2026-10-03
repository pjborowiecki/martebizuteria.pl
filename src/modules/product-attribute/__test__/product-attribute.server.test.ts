import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  deleteProductAttributes,
  getAdminProductAttributeListItems,
  getNextProductAttributeRank,
  getProductAttributesByIds,
  setProductAttributeRanks,
} from "~/src/modules/product-attribute/product-attribute.server"

interface Chain extends Promise<unknown> {
  from: () => Chain
  set: (values: unknown) => Chain
  where: (condition: unknown) => Chain
}

const database = vi.hoisted(() => {
  const state: { attributeRows: { handle: string; id: string; rank: number }[]; selectRows: readonly unknown[] } = {
    attributeRows: [],
    selectRows: [],
  }

  const makeChain = (): Chain => {
    const chain: Chain = Object.assign(Promise.resolve(state.selectRows), {
      from: () => chain,
      set: () => chain,
      where: () => chain,
    })

    return chain
  }

  const prepared = { execute: vi.fn(() => Promise.resolve(state.attributeRows)) }

  return { prepared, remove: vi.fn(makeChain), select: vi.fn(makeChain), state, update: vi.fn(makeChain) }
})

const batch = vi.hoisted(() => ({ run: vi.fn((_statements: readonly unknown[]) => Promise.resolve()) }))

const counts = vi.hoisted(() => ({ byAttributeId: vi.fn(() => Promise.resolve(new Map<string, number>())) }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    delete: database.remove,
    query: {
      productAttribute: {
        findFirst: () => ({ prepare: () => database.prepared }),
        findMany: () => ({ prepare: () => database.prepared }),
      },
    },
    select: database.select,
    update: database.update,
  },
}))

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.batch"), async (importOriginal) => ({
  ...(await importOriginal()),
  runDrizzleBatch: batch.run,
}))

vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({
  getProductCountsByAttributeId: counts.byAttributeId,
}))

const ranksFor = (count: number) => Array.from({ length: count }, (_unused, index) => ({ id: `attr-${index}`, rank: index }))

describe("getNextProductAttributeRank", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts at zero when no attribute has a rank yet", async () => {
    database.state.selectRows = [{ value: null }]

    await expect(getNextProductAttributeRank()).resolves.toBe(0)
  })

  it("starts at zero when the table is empty", async () => {
    database.state.selectRows = []

    await expect(getNextProductAttributeRank()).resolves.toBe(0)
  })

  it("returns the rank after the current maximum", async () => {
    database.state.selectRows = [{ value: 7 }]

    await expect(getNextProductAttributeRank()).resolves.toBe(8)
  })
})

describe("setProductAttributeRanks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("batches nothing when there are no updates", async () => {
    await setProductAttributeRanks([])

    expect(batch.run).toHaveBeenCalledWith([])
    expect(database.update).not.toHaveBeenCalled()
  })

  it.each([
    [1, 1],
    [49, 1],
    [50, 2],
    [98, 2],
    [99, 3],
  ])("splits %i updates into %i statements", async (updateCount, statementCount) => {
    await setProductAttributeRanks(ranksFor(updateCount))

    expect(database.update).toHaveBeenCalledTimes(statementCount)
    expect(batch.run.mock.calls[0]?.[0]).toHaveLength(statementCount)
  })
})

describe("getProductAttributesByIds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("skips the query for an empty id list", async () => {
    await expect(getProductAttributesByIds([])).resolves.toStrictEqual([])
    expect(database.select).not.toHaveBeenCalled()
  })

  it("returns the handles of the requested attributes", async () => {
    const rows = [
      { handle: "colour", id: "attr-0", rank: 0 },
      { handle: "size", id: "attr-1", rank: 1 },
    ]
    database.state.selectRows = rows

    await expect(getProductAttributesByIds(["attr-0", "attr-1"])).resolves.toStrictEqual(rows)
    expect(database.select).toHaveBeenCalledTimes(1)
  })
})

describe("deleteProductAttributes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not issue a delete for an empty id list", async () => {
    await deleteProductAttributes([])

    expect(database.remove).not.toHaveBeenCalled()
  })

  it("issues a single delete for the given ids", async () => {
    await deleteProductAttributes(["attr-0", "attr-1"])

    expect(database.remove).toHaveBeenCalledTimes(1)
  })
})

describe("getAdminProductAttributeListItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("joins the product counts onto the ordered attribute rows", async () => {
    database.state.attributeRows = [
      { handle: "colour", id: "attr-0", rank: 0 },
      { handle: "size", id: "attr-1", rank: 1 },
    ]
    counts.byAttributeId.mockResolvedValue(new Map([["attr-0", 3]]))

    await expect(getAdminProductAttributeListItems()).resolves.toStrictEqual([
      { handle: "colour", id: "attr-0", productCount: 3, rank: 0 },
      { handle: "size", id: "attr-1", productCount: 0, rank: 1 },
    ])
  })

  it("returns an empty list when there are no attributes", async () => {
    database.state.attributeRows = []
    counts.byAttributeId.mockResolvedValue(new Map())

    await expect(getAdminProductAttributeListItems()).resolves.toStrictEqual([])
  })
})
