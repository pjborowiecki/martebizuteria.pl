import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

export const localesWithIncompleteProductFormValues = (values: ProductFormValues): SupportedLocale[] =>
  I18N.SUPPORTED_LOCALES.filter((locale) => values.titles[locale].trim() === "")
