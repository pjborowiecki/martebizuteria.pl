import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { loadAttributeOnProductRows } from "~/src/modules/attribute-on-product/attribute-on-product.utils"

const operations = vi.hoisted(() => ({
  listAttributes: vi.fn(),
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))
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

beforeEach(() => {
  vi.resetAllMocks()
  operations.listAttributes.mockResolvedValue([
    definition("attr-1", "number"),
    definition("attr-2", "text"),
    definition("attr-3", "boolean"),
  ])
})

describe("loadAttributeOnProductRows", () => {
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
