import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  countForAttributeIds,
  getByProductIdQuery,
  getProductCountsByAttributeId,
} from "~/src/modules/attribute-on-product/attribute-on-product.server"

const operations = vi.hoisted(() => ({
  groupBy: vi.fn(),
  prepared: vi.fn(),
  where: vi.fn(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    query: {
      attributeOnProduct: {
        findMany: () => ({ prepare: () => ({ execute: operations.prepared }) }),
      },
    },
    select: () => ({ from: () => ({ groupBy: operations.groupBy, where: operations.where }) }),
  },
}))

const row = (attributeId: string) => ({
  attributeId,
  id: `row-${attributeId}`,
  productId: "prod-1",
  rank: 0,
  value: "gold",
})

describe("countForAttributeIds", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("answers zero without querying when no ids are given", async () => {
    await expect(countForAttributeIds([])).resolves.toBe(0)
    expect(operations.where).not.toHaveBeenCalled()
  })

  it("returns the counted rows", async () => {
    operations.where.mockResolvedValue([{ value: 3 }])

    await expect(countForAttributeIds(["attr-1", "attr-2"])).resolves.toBe(3)
    expect(operations.where).toHaveBeenCalledOnce()
  })

  it("treats an empty result as zero rather than undefined", async () => {
    operations.where.mockResolvedValue([])

    await expect(countForAttributeIds(["attr-1"])).resolves.toBe(0)
  })
})

describe("getProductCountsByAttributeId", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("keys the grouped counts by attribute id", async () => {
    operations.groupBy.mockResolvedValue([
      { attributeId: "attr-1", productCount: 2 },
      { attributeId: "attr-2", productCount: 5 },
    ])

    const counts = await getProductCountsByAttributeId()

    expect(counts.get("attr-1")).toBe(2)
    expect(counts.get("attr-2")).toBe(5)
    expect(counts.size).toBe(2)
  })

  it("returns an empty map when no attribute is in use", async () => {
    operations.groupBy.mockResolvedValue([])

    await expect(getProductCountsByAttributeId()).resolves.toStrictEqual(new Map())
  })
})

describe("getByProductIdQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("is prepared once at module load and executed per product", async () => {
    operations.prepared.mockResolvedValue([row("attr-1")])

    await expect(getByProductIdQuery.execute({ productId: "prod-1" })).resolves.toStrictEqual([row("attr-1")])
    expect(operations.prepared).toHaveBeenCalledExactlyOnceWith({ productId: "prod-1" })
  })
})
