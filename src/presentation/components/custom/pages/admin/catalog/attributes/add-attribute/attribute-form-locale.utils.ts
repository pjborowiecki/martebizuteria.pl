import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

export const isCommittedAllowedValueRow = (entry: ProductAttribute["allowedValue"]): boolean =>
  I18N.SUPPORTED_LOCALES.some((locale) => entry.labels[locale].trim() !== "")

export const localesWithIncompleteAttributeFormValues = (values: ProductAttribute["formValues"]): ProductAttribute["localeCode"][] => {
  const committedRows = values.allowedValues.filter((entry) => isCommittedAllowedValueRow(entry))

  return I18N.SUPPORTED_LOCALES.filter((locale) => {
    if (values.titles[locale].trim() === "") {
      return true
    }

    if (committedRows.length === 0) {
      return false
    }

    return committedRows.some((entry) => entry.labels[locale].trim() === "")
  })
}
