import { describe, expect, it } from "vite-plus/test"

import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"

describe("catalogFieldStringValue", () => {
  it("passes a string through unchanged, including the empty string", () => {
    expect(catalogFieldStringValue("gold chain")).toBe("gold chain")
    expect(catalogFieldStringValue("")).toBe("")
  })

  it("coerces every non-string field value to an empty string instead of rendering it", () => {
    expect(catalogFieldStringValue(undefined)).toBe("")
    expect(catalogFieldStringValue(null)).toBe("")
    expect(catalogFieldStringValue(0)).toBe("")
    expect(catalogFieldStringValue(false)).toBe("")
    expect(catalogFieldStringValue([])).toBe("")
    expect(catalogFieldStringValue({ toString: () => "gold" })).toBe("")
  })
})
