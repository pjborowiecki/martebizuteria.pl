import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

export const localesWithIncompleteCollectionFormValues = (values: ProductCollection["formValues"]): SupportedLocale[] =>
  I18N.SUPPORTED_LOCALES.filter((locale) => values.titles[locale].trim() === "")
