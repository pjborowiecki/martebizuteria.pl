import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

export const localesWithIncompleteCategoryFormValues = (values: ProductCategory["formValues"]): SupportedLocale[] =>
  I18N.SUPPORTED_LOCALES.filter((locale) => values.titles[locale].trim() === "")
