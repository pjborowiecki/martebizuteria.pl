import { LOCALES } from "~/src/integrations/use-intl/i18n.config"

import {
  type ProductAttribute,
  type ProductAttributeAllowedValue,
  type ProductAttributeLocaleCode,
} from "~/src/modules/product-attribute/product-attribute.types"

export const isCommittedAllowedValueRow = (entry: ProductAttributeAllowedValue): boolean =>
  LOCALES.some((locale) => entry.labels[locale].trim() !== "")

/** Locales still missing attribute title and/or any committed option label. */
export const localesWithIncompleteAttributeFormValues = (values: ProductAttribute["formValues"]): ProductAttributeLocaleCode[] => {
  const committedRows = values.allowedValues.filter((entry) => isCommittedAllowedValueRow(entry))

  return LOCALES.filter((locale) => {
    if (values.titles[locale].trim() === "") {
      return true
    }

    if (committedRows.length === 0) {
      return false
    }

    return committedRows.some((entry) => entry.labels[locale].trim() === "")
  })
}
