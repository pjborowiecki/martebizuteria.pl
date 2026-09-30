import { describe, expect, it } from "vite-plus/test"

import { buildCatalogFormFieldHint } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form-field-hint"

describe("buildCatalogFormFieldHint", () => {
  it("returns undefined when the field has no hint to decorate", () => {
    expect(buildCatalogFormFieldHint(undefined, true, "(required)")).toBeUndefined()
  })

  it("leaves an optional field's hint untouched", () => {
    expect(buildCatalogFormFieldHint("Shown on the storefront", false, "(required)")).toBe("Shown on the storefront")
    expect(buildCatalogFormFieldHint("Shown on the storefront", undefined, "(required)")).toBe("Shown on the storefront")
  })

  it("appends the required suffix for a required field", () => {
    expect(buildCatalogFormFieldHint("Shown on the storefront", true, "(required)")).toBe("Shown on the storefront (required)")
  })

  it("preserves the suffix spacing exactly as supplied", () => {
    expect(buildCatalogFormFieldHint("Handle", true, "  (required)  ")).toBe("Handle   (required)  ")
  })

  it("does not append a suffix that is only whitespace", () => {
    expect(buildCatalogFormFieldHint("Handle", true, "   ")).toBe("Handle")
  })

  it("does not append the suffix twice when the hint already carries it", () => {
    expect(buildCatalogFormFieldHint("Handle (required)", true, "(required)")).toBe("Handle (required)")
  })
})
