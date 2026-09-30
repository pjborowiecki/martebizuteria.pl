import { type FieldErrors } from "react-hook-form"
import { describe, expect, it } from "vite-plus/test"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import {
  allowedValueLabelFieldError,
  formatLocaleList,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-validation"

const withRowErrors = (rows: unknown): FieldErrors<ProductAttribute["formValues"]> => {
  const errors: Record<string, unknown> = { allowedValues: rows }

  return errors
}

const LOCALE_REQUIRED = { message: "localeTitleRequired", type: "custom" }

describe("formatLocaleList", () => {
  it("upper-cases and joins the locales for a single toast line", () => {
    expect(formatLocaleList(["pl-PL", "en-US"])).toBe("PL-PL, EN-US")
  })

  it("renders a single locale without a separator", () => {
    expect(formatLocaleList(["en-US"])).toBe("EN-US")
  })

  it("renders nothing for an empty list", () => {
    expect(formatLocaleList([])).toBe("")
  })
})

describe("allowedValueLabelFieldError", () => {
  it("finds the error the resolver attached to one row's locale label", () => {
    const errors = withRowErrors([{ labels: { "en-US": LOCALE_REQUIRED } }])

    expect(allowedValueLabelFieldError(errors, 0, "en-US")).toStrictEqual(LOCALE_REQUIRED)
  })

  it("reads the row at the index it is asked for", () => {
    const errors = withRowErrors([undefined, { labels: { "pl-PL": LOCALE_REQUIRED } }])

    expect(allowedValueLabelFieldError(errors, 1, "pl-PL")).toStrictEqual(LOCALE_REQUIRED)
    expect(allowedValueLabelFieldError(errors, 0, "pl-PL")).toBeUndefined()
  })

  it("reports nothing for the locale that validated cleanly", () => {
    const errors = withRowErrors([{ labels: { "en-US": LOCALE_REQUIRED } }])

    expect(allowedValueLabelFieldError(errors, 0, "pl-PL")).toBeUndefined()
  })

  it.each([[undefined], [[]], [[{}]], [[{ labels: "broken" }]], [[{ value: { message: "invalid", type: "custom" } }]]])(
    "reports nothing for the error shape %j",
    (rows) => {
      const errors = withRowErrors(rows)

      expect(allowedValueLabelFieldError(errors, 0, "en-US")).toBeUndefined()
    },
  )

  it("ignores an error object that carries no message", () => {
    const errors = withRowErrors([{ labels: { "en-US": { type: "custom" } } }])

    expect(allowedValueLabelFieldError(errors, 0, "en-US")).toBeUndefined()
  })

  it("ignores an error object whose message is empty", () => {
    const errors = withRowErrors([{ labels: { "en-US": { message: "", type: "custom" } } }])

    expect(allowedValueLabelFieldError(errors, 0, "en-US")).toBeUndefined()
  })

  it("reports nothing when the index is past the rows the resolver flagged", () => {
    const errors = withRowErrors([{ labels: { "en-US": LOCALE_REQUIRED } }])

    expect(allowedValueLabelFieldError(errors, 5, "en-US")).toBeUndefined()
  })
})
