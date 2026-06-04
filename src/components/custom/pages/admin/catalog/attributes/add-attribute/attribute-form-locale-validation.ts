import type { FieldError, FieldErrors } from "react-hook-form";

import { LOCALES } from "~/src/constants/_constants/locales";

import type { ProductAttribute, ProductAttributeLocaleCode } from "~/src/modules/product-attribute/product-attribute.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && typeof value.message === "string" && value.message !== "";
}

function hasNestedFieldError(errors: Record<string, unknown> | undefined, locale: ProductAttributeLocaleCode): boolean {
  if (errors === undefined) {
    return false;
  }

  const entry = errors[locale];
  return entry !== undefined && entry !== null;
}

function readAllowedValueLabelErrors(rowError: unknown): Record<string, unknown> | undefined {
  if (!isRecord(rowError) || !("labels" in rowError)) {
    return undefined;
  }

  const { labels } = rowError;
  return isRecord(labels) ? labels : undefined;
}

export function localesWithTitleValidationErrors(errors: FieldErrors<ProductAttribute["formValues"]>): ProductAttributeLocaleCode[] {
  const titleErrors = errors.titles;

  if (titleErrors === undefined || typeof titleErrors !== "object") {
    return [];
  }

  return LOCALES.filter((locale) => hasNestedFieldError(titleErrors as Record<string, unknown>, locale));
}

export function localesWithAllowedValueLabelErrors(errors: FieldErrors<ProductAttribute["formValues"]>): ProductAttributeLocaleCode[] {
  const allowedValueErrors = errors.allowedValues;

  if (!Array.isArray(allowedValueErrors)) {
    return [];
  }

  const localesWithErrors = new Set<ProductAttributeLocaleCode>();

  for (const rowError of allowedValueErrors) {
    const labelErrors = readAllowedValueLabelErrors(rowError);
    if (labelErrors !== undefined) {
      for (const locale of LOCALES) {
        if (hasNestedFieldError(labelErrors, locale)) {
          localesWithErrors.add(locale);
        }
      }
    }
  }

  return LOCALES.filter((locale) => localesWithErrors.has(locale));
}

export function localesWithAttributeFormValidationErrors(
  errors: FieldErrors<ProductAttribute["formValues"]>
): ProductAttributeLocaleCode[] {
  const locales = new Set<ProductAttributeLocaleCode>([
    ...localesWithTitleValidationErrors(errors),
    ...localesWithAllowedValueLabelErrors(errors)
  ]);

  return LOCALES.filter((locale) => locales.has(locale));
}

export function formatLocaleList(locales: readonly ProductAttributeLocaleCode[]): string {
  return locales.map((locale) => locale.toUpperCase()).join(", ");
}

export function allowedValueLabelFieldError(
  errors: FieldErrors<ProductAttribute["formValues"]>,
  rowIndex: number,
  locale: ProductAttributeLocaleCode
): FieldError | undefined {
  const rowErrors = errors.allowedValues?.[rowIndex];
  const labelErrors = readAllowedValueLabelErrors(rowErrors);

  if (labelErrors === undefined) {
    return undefined;
  }

  const localeError = labelErrors[locale];

  if (!isFieldError(localeError)) {
    return undefined;
  }

  return localeError;
}
