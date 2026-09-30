import { describe, expect, it } from "vite-plus/test"

import { localesWithIncompleteProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-locale.utils"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

describe("localesWithIncompleteProductFormValues", () => {
  it("reports every supported locale for a brand new form", () => {
    expect(localesWithIncompleteProductFormValues(createEmptyProductFormValues())).toStrictEqual(["pl-PL", "en-US"])
  })

  it("reports only the locale whose title is still missing", () => {
    const values = createEmptyProductFormValues()
    values.titles["pl-PL"] = "Złoty łańcuszek"

    expect(localesWithIncompleteProductFormValues(values)).toStrictEqual(["en-US"])
  })

  it("treats a whitespace-only title as missing", () => {
    const values = createEmptyProductFormValues()
    values.titles["pl-PL"] = "   "
    values.titles["en-US"] = "Gold chain"

    expect(localesWithIncompleteProductFormValues(values)).toStrictEqual(["pl-PL"])
  })

  it("reports nothing once both locales carry a title", () => {
    const values = createEmptyProductFormValues()
    values.titles["pl-PL"] = "Złoty łańcuszek"
    values.titles["en-US"] = "Gold chain"

    expect(localesWithIncompleteProductFormValues(values)).toStrictEqual([])
  })
})
