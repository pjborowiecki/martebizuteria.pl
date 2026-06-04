import { LOCALES } from "~/src/constants/_constants/locales";

import type {
  ProductAttribute,
  ProductAttributeAllowedValue,
  ProductAttributeLocaleCode
} from "~/src/modules/product-attribute/product-attribute.types";

const ZERO_LENGTH = 0;

export function isCommittedAllowedValueRow(entry: ProductAttributeAllowedValue): boolean {
  return LOCALES.some((locale) => (entry.labels[locale] ?? "").trim() !== "");
}

/** Locales still missing attribute title and/or any committed option label. */
export function localesWithIncompleteAttributeFormValues(values: ProductAttribute["formValues"]): ProductAttributeLocaleCode[] {
  const committedRows = values.allowedValues.filter((entry) => isCommittedAllowedValueRow(entry));

  return LOCALES.filter((locale) => {
    if (values.titles[locale].trim() === "") {
      return true;
    }

    if (committedRows.length === ZERO_LENGTH) {
      return false;
    }

    return committedRows.some((entry) => (entry.labels[locale] ?? "").trim() === "");
  });
}
