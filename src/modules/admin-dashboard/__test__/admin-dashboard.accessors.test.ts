import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))

const { resolveTopProductCategoryLabel, resolveTopProductName } = await import("~/src/modules/admin-dashboard/admin-dashboard.accessors")

describe("resolveTopProductName", () => {
  it("falls back to the order item title when the product row is gone", () => {
    expect(resolveTopProductName(null, "Srebrny pierścionek", "en-US")).toBe("Srebrny pierścionek")
    expect(resolveTopProductName(undefined, "Srebrny pierścionek", "en-US")).toBe("Srebrny pierścionek")
  })

  it("prefers the live product title in the requested locale over the stored order item title", () => {
    expect(resolveTopProductName({ "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" }, "Old title", "en-US")).toBe("Silver ring")
  })

  it("falls back to the default locale when the requested locale is blank", () => {
    expect(resolveTopProductName({ "en-US": "", "pl-PL": "Srebrny pierścionek" }, "Old title", "en-US")).toBe("Srebrny pierścionek")
  })

  it("lifts a legacy plain string title into the default locale", () => {
    expect(resolveTopProductName("Srebrny pierścionek", "Old title", "en-US")).toBe("Srebrny pierścionek")
  })

  it("returns an empty name rather than the fallback when the title map is present but empty", () => {
    expect(resolveTopProductName({ "en-US": "", "pl-PL": "" }, "Old title", "en-US")).toBe("")
  })
})

describe("resolveTopProductCategoryLabel", () => {
  it("returns an empty label when the product has no primary category", () => {
    expect(resolveTopProductCategoryLabel(null, "en-US")).toBe("")
    expect(resolveTopProductCategoryLabel(undefined, "en-US")).toBe("")
  })

  it("resolves the category title in the requested locale", () => {
    expect(resolveTopProductCategoryLabel({ "en-US": "Rings", "pl-PL": "Pierścionki" }, "en-US")).toBe("Rings")
  })

  it("falls back to the default locale for an unsupported locale", () => {
    expect(resolveTopProductCategoryLabel({ "en-US": "Rings", "pl-PL": "Pierścionki" }, "de-DE")).toBe("Pierścionki")
  })

  it("ignores a shape it cannot read", () => {
    expect(resolveTopProductCategoryLabel(["Rings"], "en-US")).toBe("")
  })
})
