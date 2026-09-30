import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { countProductsForCollections } from "~/src/modules/collection-on-product/collection-on-product.accessors"

const database = vi.hoisted(() => {
  const where = vi.fn((): Promise<{ value: number }[]> => Promise.resolve([]))
  const prepared = { execute: vi.fn() }
  const from = vi.fn(() => ({ groupBy: () => ({ prepare: () => prepared }), prepare: () => prepared, where }))
  const select = vi.fn(() => ({ from }))

  return { from, select, where }
})

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: { select: database.select } }))

describe("countProductsForCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("short circuits an empty id list without querying", async () => {
    await expect(countProductsForCollections([])).resolves.toBe(0)
    expect(database.select).not.toHaveBeenCalled()
  })

  it("returns the aggregate count for the requested collections", async () => {
    database.where.mockResolvedValue([{ value: 12 }])

    await expect(countProductsForCollections(["collection-a", "collection-b"])).resolves.toBe(12)
    expect(database.select).toHaveBeenCalledTimes(1)
  })

  it("falls back to zero when the aggregate returns no row", async () => {
    database.where.mockResolvedValue([])

    await expect(countProductsForCollections(["collection-a"])).resolves.toBe(0)
  })
})
