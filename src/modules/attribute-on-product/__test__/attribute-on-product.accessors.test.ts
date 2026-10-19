import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  countForAttributeIds,
  getByProductIdQuery,
  getProductCountsByAttributeId,
  loadAttributeOnProductRows,
} from "~/src/modules/attribute-on-product/attribute-on-product.accessors"

const operations = vi.hoisted(() => ({
  groupBy: vi.fn(),
  listAttributes: vi.fn(),
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
vi.mock("~/src/modules/product-attribute/product-attribute.accessors", () => ({
  getAdminProductAttributesQuery: { execute: operations.listAttributes },
}))

const AT = new Date("2026-01-01T00:00:00.000Z")

const definition = (id: string, type: "boolean" | "multiselect" | "number" | "select" | "text") => ({
  allowedValues: null,
  createdAt: AT,
  handle: id,
  id,
  rank: 0,
  titles: { "en-US": id, "pl-PL": id },
  type,
  unit: null,
  updatedAt: AT,
})

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

describe("loadAttributeOnProductRows", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.listAttributes.mockResolvedValue([
      definition("attr-1", "number"),
      definition("attr-2", "text"),
      definition("attr-3", "boolean"),
    ])
  })

  it("skips reading the definitions when there is nothing to store", async () => {
    await expect(loadAttributeOnProductRows("prod-1", [], [{ rows: [], variantId: "var-1" }])).resolves.toStrictEqual([])

    expect(operations.listAttributes).not.toHaveBeenCalled()
  })

  it("normalizes each product value against its own definition", async () => {
    await expect(
      loadAttributeOnProductRows("prod-1", [
        { attributeId: "attr-3", id: "row-1", value: "Yes" },
        { attributeId: "attr-2", id: "row-2", value: " gold " },
      ]),
    ).resolves.toStrictEqual([
      { attributeId: "attr-3", id: "row-1", productId: "prod-1", rank: 0, value: "true", variantId: undefined },
      { attributeId: "attr-2", id: "row-2", productId: "prod-1", rank: 1, value: " gold ", variantId: undefined },
    ])
  })

  it("keeps a value whose definition is unknown as it was entered", async () => {
    const rows = await loadAttributeOnProductRows("prod-1", [{ attributeId: "attr-unknown", value: "  raw  " }])

    expect(rows).toStrictEqual([expect.objectContaining({ attributeId: "attr-unknown", value: "  raw  " })])
  })

  it("tags each variant group's rows with its variant id and leaves product rows unscoped", async () => {
    const rows = await loadAttributeOnProductRows(
      "prod-1",
      [{ attributeId: "attr-2", value: "gold" }],
      [
        { rows: [{ attributeId: "attr-1", value: " 12 " }], variantId: "var-1" },
        { rows: [{ attributeId: "attr-1", value: "18" }], variantId: "var-2" },
      ],
    )

    expect(rows).toStrictEqual([
      expect.objectContaining({ attributeId: "attr-2", value: "gold", variantId: undefined }),
      expect.objectContaining({ attributeId: "attr-1", value: "12", variantId: "var-1" }),
      expect.objectContaining({ attributeId: "attr-1", value: "18", variantId: "var-2" }),
    ])
  })

  it("ranks the rows of each variant group from zero independently", async () => {
    const rows = await loadAttributeOnProductRows(
      "prod-1",
      [],
      [
        {
          rows: [
            { attributeId: "attr-1", value: "12" },
            { attributeId: "attr-2", value: "gold" },
          ],
          variantId: "var-1",
        },
        { rows: [{ attributeId: "attr-1", value: "18" }], variantId: "var-2" },
      ],
    )

    expect(rows).toStrictEqual([
      expect.objectContaining({ rank: 0, variantId: "var-1" }),
      expect.objectContaining({ rank: 1, variantId: "var-1" }),
      expect.objectContaining({ rank: 0, variantId: "var-2" }),
    ])
  })

  it("reads the definitions once for both scopes", async () => {
    await loadAttributeOnProductRows(
      "prod-1",
      [{ attributeId: "attr-2", value: "gold" }],
      [{ rows: [{ attributeId: "attr-1", value: "12" }], variantId: "var-1" }],
    )

    expect(operations.listAttributes).toHaveBeenCalledOnce()
  })
})
