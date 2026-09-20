import { LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { type Category } from "~/src/modules/product-category/product-category.types"
export const localesWithIncompleteCategoryFormValues = (values: Category["formValues"]): Locale[] =>
  LOCALES.filter((locale) => values.titles[locale].trim() === "")
