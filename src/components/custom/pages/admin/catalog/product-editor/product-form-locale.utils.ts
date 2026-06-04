import { LOCALES } from "~/src/constants/_constants/locales";
import type { Locale } from "~/src/constants/types";

import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

export function localesWithIncompleteProductFormValues(values: ProductFormValues): Locale[] {
  return LOCALES.filter((locale) => values.titles[locale].trim() === "");
}
