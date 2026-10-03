import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { deleteCollections, setCollectionRanks } from "~/src/modules/product-collection/product-collection.server"

interface Chain extends Promise<unknown> {
  from: () => Chain
  prepare: () => { execute: () => Promise<readonly unknown[]> }
  set: (values: unknown) => Chain
  where: (condition: unknown) => Chain
}

const database = vi.hoisted(() => {
  const state: { rows: readonly unknown[] } = { rows: [] }
  const prepared = { execute: () => Promise.resolve(state.rows) }

  const makeChain = (): Chain => {
    const chain: Chain = Object.assign(Promise.resolve(state.rows), {
      from: () => chain,
      prepare: () => prepared,
      set: () => chain,
      where: () => chain,
    })

    return chain
  }

  return {
    batch: vi.fn((statements: readonly unknown[]) => Promise.resolve(statements)),
    remove: vi.fn(makeChain),
    select: vi.fn(makeChain),
    state,
    update: vi.fn(makeChain),
  }
})

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    batch: database.batch,
    delete: database.remove,
    query: {
      productCollection: {
        findFirst: () => ({ prepare: () => ({ execute: () => Promise.resolve(database.state.rows[0]) }) }),
        findMany: () => ({ prepare: () => ({ execute: () => Promise.resolve(database.state.rows) }) }),
      },
    },
    select: database.select,
    update: database.update,
  },
}))

const ranksFor = (count: number) => Array.from({ length: count }, (_unused, index) => ({ id: `collection-${index}`, rank: index }))

describe("setCollectionRanks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not touch the table when there is nothing to reorder", async () => {
    await setCollectionRanks([])

    expect(database.update).not.toHaveBeenCalled()
  })

  it("reorders a short list in a single statement", async () => {
    await setCollectionRanks(ranksFor(3))

    expect(database.update).toHaveBeenCalledTimes(1)
    expect(database.batch).toHaveBeenCalledTimes(1)
  })

  it("splits a long reorder into statements D1 accepts, sent together in one batch", async () => {
    await setCollectionRanks(ranksFor(61))

    expect(database.update).toHaveBeenCalledTimes(2)
    expect(database.batch).toHaveBeenCalledTimes(1)
  })
})

describe("deleteCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not issue a delete for an empty id list", async () => {
    await deleteCollections([])

    expect(database.remove).not.toHaveBeenCalled()
  })

  it("issues a single delete for the given ids", async () => {
    await deleteCollections(["collection-0", "collection-1"])

    expect(database.remove).toHaveBeenCalledTimes(1)
  })
})
