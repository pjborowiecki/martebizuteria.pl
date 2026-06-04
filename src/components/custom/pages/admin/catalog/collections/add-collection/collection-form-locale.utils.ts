import { LOCALES } from "~/src/constants/_constants/locales";
import type { Locale } from "~/src/constants/types";

import type { Collection } from "~/src/modules/product-collection/product-collection.types";

export function localesWithIncompleteCollectionFormValues(values: Collection["formValues"]): Locale[] {
  return LOCALES.filter((locale) => values.titles[locale].trim() === "");
}
