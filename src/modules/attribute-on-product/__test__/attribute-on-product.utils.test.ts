import { describe, expect, it, vi } from "vite-plus/test"

import { normalizeAttributeOnProductRows } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock("cloudflare:workers", async () => {
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { env: { DB: createTestD1Database(sqlite) } }
})

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/u

const AT = new Date("2026-01-01T00:00:00.000Z")

const definition = (
  id: string,
  type: ProductAttribute["select"]["type"],
  allowedValues: ProductAttribute["select"]["allowedValues"] = null,
): ProductAttribute["select"] => ({
  allowedValues,
  createdAt: AT,
  handle: id,
  id,
  rank: 0,
  titles: { "en-US": id, "pl-PL": id },
  type,
  unit: null,
  updatedAt: AT,
})

describe("normalizeAttributeOnProductRows", () => {
  it("returns nothing for an empty row list", () => {
    expect(normalizeAttributeOnProductRows({ productAttributes: [], productId: "prod-1", rows: [] })).toStrictEqual([])
  })

  it("stamps the product id on every row and leaves the variant id unset", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "text")],
      productId: "prod-1",
      rows: [{ attributeId: "attr-1", value: "18k gold" }],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.productId).toBe("prod-1")
    expect(rows[0]?.variantId).toBeUndefined()
  })

  it("scopes the rows to a variant when one is supplied", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "text")],
      productId: "prod-1",
      rows: [{ attributeId: "attr-1", value: "18k gold" }],
      variantId: "var-1",
    })

    expect(rows[0]?.variantId).toBe("var-1")
  })

  it("falls back to the array position when a row carries no rank", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "text"), definition("attr-2", "text")],
      productId: "prod-1",
      rows: [
        { attributeId: "attr-1", value: "first" },
        { attributeId: "attr-2", rank: 9, value: "second" },
      ],
    })

    expect(rows.map((row) => row.rank)).toStrictEqual([0, 9])
  })

  it("keeps an explicit rank of zero rather than treating it as missing", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "text"), definition("attr-2", "text")],
      productId: "prod-1",
      rows: [
        { attributeId: "attr-1", rank: 0, value: "first" },
        { attributeId: "attr-2", rank: 0, value: "second" },
      ],
    })

    expect(rows.map((row) => row.rank)).toStrictEqual([0, 0])
  })

  it("keeps an existing row id and mints a uuid for a new row", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "text"), definition("attr-2", "text")],
      productId: "prod-1",
      rows: [
        { attributeId: "attr-1", id: "row-1", value: "first" },
        { attributeId: "attr-2", value: "second" },
      ],
    })

    expect(rows[0]?.id).toBe("row-1")
    expect(rows[1]?.id).toMatch(UUID_PATTERN)
  })

  it("normalizes a boolean value to the stored literal", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "boolean"), definition("attr-2", "boolean")],
      productId: "prod-1",
      rows: [
        { attributeId: "attr-1", value: "Yes" },
        { attributeId: "attr-2", value: "0" },
      ],
    })

    expect(rows.map((row) => row.value)).toStrictEqual(["true", "false"])
  })

  it("stores a multiselect value as a json array", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "multiselect")],
      productId: "prod-1",
      rows: [{ attributeId: "attr-1", value: "gold, silver" }],
    })

    expect(rows[0]?.value).toBe('["gold","silver"]')
  })

  it("trims a number value", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "number")],
      productId: "prod-1",
      rows: [{ attributeId: "attr-1", value: "  12.5  " }],
    })

    expect(rows[0]?.value).toBe("12.5")
  })

  it("keeps a select value that the definition allows", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [definition("attr-1", "select", [{ labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" }])],
      productId: "prod-1",
      rows: [{ attributeId: "attr-1", value: " gold " }],
    })

    expect(rows[0]?.value).toBe("gold")
  })

  it("treats a row with no matching definition as free text", () => {
    const rows = normalizeAttributeOnProductRows({
      productAttributes: [],
      productId: "prod-1",
      rows: [{ attributeId: "attr-unknown", value: "  keep spacing  " }],
    })

    expect(rows[0]?.value).toBe("  keep spacing  ")
    expect(rows[0]?.attributeId).toBe("attr-unknown")
  })
})
