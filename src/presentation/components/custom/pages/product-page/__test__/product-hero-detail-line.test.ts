import { describe, expect, it } from "vite-plus/test"

import { type Product } from "~/src/modules/product/product.types"

import { resolveProductHeroDetailLine } from "~/src/presentation/components/custom/pages/product-page/product-hero-detail-line"

const spec = (overrides: Partial<Product["specification"]>): Product["specification"] => ({
  allowedValues: null,
  handle: "material",
  rank: 0,
  titles: { "en-US": "Material", "pl-PL": "Material" },
  type: "text",
  unit: null,
  value: "Silver",
  ...overrides,
})

describe("resolveProductHeroDetailLine", () => {
  it("prefers the subtitle over the material specification", () => {
    expect(resolveProductHeroDetailLine("Handmade in Krakow", [spec({})], "en-US")).toBe("Handmade in Krakow")
  })

  it("ignores a subtitle that is only whitespace", () => {
    expect(resolveProductHeroDetailLine("   ", [spec({ value: "Gold" })], "en-US")).toBe("Gold")
  })

  it("returns undefined when there is no material specification", () => {
    expect(resolveProductHeroDetailLine("", [spec({ handle: "weight" })], "en-US")).toBeUndefined()
  })

  it("returns undefined when the material value is blank", () => {
    expect(resolveProductHeroDetailLine("", [spec({ value: "  " })], "en-US")).toBeUndefined()
  })

  it("returns undefined when there are no specifications at all", () => {
    expect(resolveProductHeroDetailLine("", [], "en-US")).toBeUndefined()
  })

  it("appends the unit for a numeric material specification", () => {
    expect(resolveProductHeroDetailLine("", [spec({ type: "number", unit: "g", value: "12" })], "en-US")).toBe("12 g")
  })

  it("resolves a select material value to its localized label", () => {
    const specification = spec({
      allowedValues: [{ labels: { "en-US": "Sterling silver", "pl-PL": "Srebro" }, value: "silver-925" }],
      type: "select",
      value: "silver-925",
    })

    expect(resolveProductHeroDetailLine("", [specification], "en-US")).toBe("Sterling silver")
    expect(resolveProductHeroDetailLine("", [specification], "pl-PL")).toBe("Srebro")
  })

  it("keeps the raw select value when no allowed value matches", () => {
    const specification = spec({
      allowedValues: [{ labels: { "en-US": "Gold", "pl-PL": "Zloto" }, value: "gold" }],
      type: "select",
      value: "platinum",
    })

    expect(resolveProductHeroDetailLine("", [specification], "en-US")).toBe("platinum")
  })

  it("uses the first material specification when several are present", () => {
    expect(resolveProductHeroDetailLine("", [spec({ value: "Silver" }), spec({ value: "Gold" })], "en-US")).toBe("Silver")
  })
})
