import { LOCALES } from "~/src/constants/_constants/locales";
import type { Locale } from "~/src/constants/types";

import type { Category } from "~/src/modules/product-category/product-category.types";

export function localesWithIncompleteCategoryFormValues(values: Category["formValues"]): Locale[] {
  return LOCALES.filter((locale) => values.titles[locale].trim() === "");
}
