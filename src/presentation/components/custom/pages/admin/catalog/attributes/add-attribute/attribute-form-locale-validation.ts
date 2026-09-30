import { type FieldError, type FieldErrors } from "react-hook-form"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isFieldError = (value: unknown): value is FieldError =>
  isRecord(value) && typeof value["message"] === "string" && value["message"] !== ""

const readAllowedValueLabelErrors = (rowError: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(rowError) || !("labels" in rowError)) {
    return undefined
  }

  const { labels } = rowError

  return isRecord(labels) ? labels : undefined
}

export const formatLocaleList = (locales: readonly ProductAttribute["localeCode"][]): string =>
  locales.map((locale) => locale.toUpperCase()).join(", ")

export const allowedValueLabelFieldError = (
  errors: FieldErrors<ProductAttribute["formValues"]>,
  rowIndex: number,
  locale: ProductAttribute["localeCode"],
): FieldError | undefined => {
  const rowErrors = errors.allowedValues?.[rowIndex]
  const labelErrors = readAllowedValueLabelErrors(rowErrors)
  if (labelErrors === undefined) {
    return undefined
  }

  const localeError = labelErrors[locale]
  if (!isFieldError(localeError)) {
    return undefined
  }

  return localeError
}
