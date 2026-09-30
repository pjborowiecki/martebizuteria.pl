import { describe, expect, it } from "vite-plus/test"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import {
  isCommittedAllowedValueRow,
  localesWithIncompleteAttributeFormValues,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale.utils"

const row = (pl: string, en: string, value = "silver"): ProductAttribute["allowedValue"] => ({
  labels: { "en-US": en, "pl-PL": pl },
  value,
})

const formValues = (
  titles: ProductAttribute["localeMap"],
  allowedValues: readonly ProductAttribute["allowedValue"][],
): ProductAttribute["formValues"] => ({
  allowedValues: [...allowedValues],
  handle: "material",
  titles,
  type: "select",
  unit: "",
})

const BOTH_TITLES: ProductAttribute["localeMap"] = { "en-US": "Material", "pl-PL": "Materiał" }

describe("isCommittedAllowedValueRow", () => {
  it("counts a row the editor has started filling in the polish locale", () => {
    expect(isCommittedAllowedValueRow(row("Srebro", ""))).toBe(true)
  })

  it("counts a row the editor has started filling in the english locale", () => {
    expect(isCommittedAllowedValueRow(row("", "Silver"))).toBe(true)
  })

  it("ignores an untouched row", () => {
    expect(isCommittedAllowedValueRow(row("", ""))).toBe(false)
  })

  it("ignores a row holding only whitespace", () => {
    expect(isCommittedAllowedValueRow(row("   ", "\t"))).toBe(false)
  })
})

describe("localesWithIncompleteAttributeFormValues", () => {
  it("reports nothing when both titles are filled and there are no option rows", () => {
    const values = formValues(BOTH_TITLES, [])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual([])
  })

  it("reports the locale whose title is still blank", () => {
    const values = formValues({ "en-US": "", "pl-PL": "Materiał" }, [])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual(["en-US"])
  })

  it("treats a whitespace-only title as blank", () => {
    const values = formValues({ "en-US": "Material", "pl-PL": "   " }, [])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual(["pl-PL"])
  })

  it("reports both locales when neither title is filled", () => {
    const values = formValues({ "en-US": "", "pl-PL": "" }, [])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual(["pl-PL", "en-US"])
  })

  it("reports the locale a started option row is missing a label for", () => {
    const values = formValues(BOTH_TITLES, [row("Srebro", "")])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual(["en-US"])
  })

  it("ignores rows the editor has not started at all", () => {
    const values = formValues(BOTH_TITLES, [row("Srebro", "Silver"), row("", "", "gold")])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual([])
  })

  it("reports a locale missing from any single started row, not only the first", () => {
    const values = formValues(BOTH_TITLES, [row("Srebro", "Silver"), row("Złoto", "", "gold")])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual(["en-US"])
  })

  it("combines a blank title in one locale with a missing option label in the other", () => {
    const values = formValues({ "en-US": "", "pl-PL": "Materiał" }, [row("", "Silver")])

    expect(localesWithIncompleteAttributeFormValues(values)).toStrictEqual(["pl-PL", "en-US"])
  })
})
