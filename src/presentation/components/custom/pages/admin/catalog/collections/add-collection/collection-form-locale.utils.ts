import { LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { type Collection } from "~/src/modules/product-collection/product-collection.types"
export const localesWithIncompleteCollectionFormValues = (values: Collection["formValues"]): Locale[] =>
  LOCALES.filter((locale) => values.titles[locale].trim() === "")
