import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { replaceAllAttributesForProduct, replaceAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils"

const operations = vi.hoisted(() => ({
  deleteWhere: vi.fn(),
  insertRows: vi.fn(),
  listAttributes: vi.fn(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { delete: () => ({ where: operations.deleteWhere }) },
}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({ insertRows: operations.insertRows }))
vi.mock("~/src/modules/product-attribute/product-attribute.server", () => ({
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

describe("replaceAttributesForProduct", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.deleteWhere.mockResolvedValue(undefined)
    operations.insertRows.mockResolvedValue(undefined)
    operations.listAttributes.mockResolvedValue([definition("attr-1", "boolean"), definition("attr-2", "text")])
  })

  it("clears the product's attributes without reading definitions when there is nothing to store", async () => {
    await replaceAttributesForProduct("prod-1", [])

    expect(operations.listAttributes).not.toHaveBeenCalled()
    expect(operations.deleteWhere).toHaveBeenCalledOnce()
    expect(operations.insertRows).toHaveBeenCalledExactlyOnceWith([])
  })

  it("normalizes each value against its own definition", async () => {
    await replaceAttributesForProduct("prod-1", [
      { attributeId: "attr-1", id: "row-1", value: "Yes" },
      { attributeId: "attr-2", id: "row-2", value: " gold " },
    ])

    expect(operations.insertRows).toHaveBeenCalledExactlyOnceWith([
      { attributeId: "attr-1", id: "row-1", productId: "prod-1", rank: 0, value: "true", variantId: undefined },
      { attributeId: "attr-2", id: "row-2", productId: "prod-1", rank: 1, value: " gold ", variantId: undefined },
    ])
  })

  it("clears the previous rows before inserting the new ones", async () => {
    const order: string[] = []
    operations.deleteWhere.mockImplementation(() => {
      order.push("delete")

      return Promise.resolve(undefined)
    })
    operations.insertRows.mockImplementation(() => {
      order.push("insert")

      return Promise.resolve(undefined)
    })

    await replaceAttributesForProduct("prod-1", [{ attributeId: "attr-2", value: "gold" }])

    expect(order).toStrictEqual(["delete", "insert"])
  })

  it("ignores definitions the product does not reference", async () => {
    await replaceAttributesForProduct("prod-1", [{ attributeId: "attr-unknown", value: "  raw  " }])

    expect(operations.insertRows).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ attributeId: "attr-unknown", value: "  raw  " }),
    ])
  })
})

describe("replaceAllAttributesForProduct", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.deleteWhere.mockResolvedValue(undefined)
    operations.insertRows.mockResolvedValue(undefined)
    operations.listAttributes.mockResolvedValue([definition("attr-1", "number"), definition("attr-2", "text")])
  })

  it("clears everything and writes nothing when neither scope has values", async () => {
    await replaceAllAttributesForProduct("prod-1", [], [])

    expect(operations.listAttributes).not.toHaveBeenCalled()
    expect(operations.deleteWhere).toHaveBeenCalledOnce()
    expect(operations.insertRows).not.toHaveBeenCalled()
  })

  it("tags each variant group's rows with its variant id and leaves product rows unscoped", async () => {
    await replaceAllAttributesForProduct(
      "prod-1",
      [{ attributeId: "attr-2", value: "gold" }],
      [
        { rows: [{ attributeId: "attr-1", value: " 12 " }], variantId: "var-1" },
        { rows: [{ attributeId: "attr-1", value: "18" }], variantId: "var-2" },
      ],
    )

    expect(operations.insertRows).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ attributeId: "attr-2", value: "gold", variantId: undefined }),
      expect.objectContaining({ attributeId: "attr-1", value: "12", variantId: "var-1" }),
      expect.objectContaining({ attributeId: "attr-1", value: "18", variantId: "var-2" }),
    ])
  })

  it("ranks the rows of each variant group from zero independently", async () => {
    await replaceAllAttributesForProduct(
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

    expect(operations.insertRows).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ rank: 0, variantId: "var-1" }),
      expect.objectContaining({ rank: 1, variantId: "var-1" }),
      expect.objectContaining({ rank: 0, variantId: "var-2" }),
    ])
  })

  it("reads the definitions once for both scopes", async () => {
    await replaceAllAttributesForProduct(
      "prod-1",
      [{ attributeId: "attr-2", value: "gold" }],
      [{ rows: [{ attributeId: "attr-1", value: "12" }], variantId: "var-1" }],
    )

    expect(operations.listAttributes).toHaveBeenCalledOnce()
  })

  it("writes nothing when only empty variant groups are supplied", async () => {
    await replaceAllAttributesForProduct("prod-1", [], [{ rows: [], variantId: "var-1" }])

    expect(operations.deleteWhere).toHaveBeenCalledOnce()
    expect(operations.insertRows).not.toHaveBeenCalled()
  })
})
