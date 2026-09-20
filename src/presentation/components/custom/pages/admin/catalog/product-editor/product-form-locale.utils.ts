import { LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { type ProductFormValues } from "~/src/modules/product/product.zod"
export const localesWithIncompleteProductFormValues = (values: ProductFormValues): Locale[] =>
  LOCALES.filter((locale) => values.titles[locale].trim() === "")
