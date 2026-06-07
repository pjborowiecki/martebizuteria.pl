import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";

import {
  coerceProductAttributeLocaleMap,
  normalizeProductAttributeLocaleMapForSave
} from "~/src/modules/product-attribute/product-attribute.utils";
import type { ProductLocaleMap } from "~/src/modules/product/product.types";
import { coerceProductLocaleMap, resolveProductTitle } from "~/src/modules/product/product.utils";

const EMPTY_LENGTH = 0;

export function resolveProductOptionTitle(titles: unknown, locale: string): string {
  return resolveProductTitle(titles, locale);
}

export function resolveProductOptionValueLabel(labels: unknown, locale: string): string {
  return resolveProductTitle(labels, locale);
}

export function coerceProductOptionValueLabels(value: unknown): ProductLocaleMap {
  if (typeof value === "string") {
    return coerceProductAttributeLocaleMap({ [DEFAULT_LOCALE]: value });
  }

  return coerceProductLocaleMap(value);
}

export function normalizeProductOptionValueLabelsForSave(labels: ProductLocaleMap): ProductLocaleMap {
  const normalized = normalizeProductAttributeLocaleMapForSave(labels);
  if (LOCALES.every((locale) => normalized[locale] === "")) {
    return coerceProductAttributeLocaleMap({ [DEFAULT_LOCALE]: "" });
  }

  return normalized;
}

export function hasCompleteOptionValueLabels(labels: ProductLocaleMap): boolean {
  return LOCALES.every((locale) => labels[locale].trim() !== "");
}

export function filterCompleteOptionValueLabels(values: readonly { readonly labels: ProductLocaleMap }[]): typeof values {
  return values.filter((entry) => hasCompleteOptionValueLabels(entry.labels));
}

export function distinctOptionValueLabels(values: readonly ProductLocaleMap[]): ProductLocaleMap[] {
  const seen = new Set<string>();

  return values.filter((labels) => {
    const key = LOCALES.map((locale) => labels[locale].trim()).join("|");
    const isEmpty = key === "|".repeat(LOCALES.length - EMPTY_LENGTH);
    if (isEmpty || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
