import { z } from "zod/v4";

import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";

import {
  PRODUCT_ATTRIBUTE_STAT_FILTER,
  PRODUCT_ATTRIBUTE_TYPE,
  PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE,
  PRODUCT_ATTRIBUTE_UNIT_PRESETS,
  type ProductAttributeStatFilter,
  type ProductAttributeType,
  type ProductAttributeUnitPreset,
  productAttributeTypeUsesAllowedValues
} from "~/src/modules/product-attribute/product-attribute.constants";
import type {
  ProductAttribute,
  ProductAttributeAllowedValue,
  ProductAttributeLocaleCode,
  ProductAttributeLocaleMap
} from "~/src/modules/product-attribute/product-attribute.types";

const MULTISELECT_SEPARATOR = ", ";
const ALLOWED_VALUES_DISPLAY_SEPARATOR = ", ";
const ZERO_LENGTH = 0;

const UNIT_PRESET_SET = new Set<string>(PRODUCT_ATTRIBUTE_UNIT_PRESETS);

const rawAllowedValuesCoerceSchema = z.array(
  z.object({
    labels: z.record(z.string(), z.string()),
    value: z.string()
  })
);

export function coerceProductAttributeAllowedValues(value: unknown): ProductAttributeAllowedValue[] | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = rawAllowedValuesCoerceSchema.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }

  return parsed.data.map((entry) => ({
    labels: coerceProductAttributeLocaleMap(entry.labels),
    value: entry.value
  }));
}

export function createEmptyProductAttributeLocaleMap(): ProductAttributeLocaleMap {
  return Object.fromEntries(LOCALES.map((locale) => [locale, ""])) as ProductAttributeLocaleMap;
}

export function coerceProductAttributeLocaleMap(value: Partial<ProductAttributeLocaleMap> | null | undefined): ProductAttributeLocaleMap {
  const empty = createEmptyProductAttributeLocaleMap();

  if (value === null || value === undefined || typeof value !== "object") {
    return empty;
  }

  return Object.fromEntries(
    LOCALES.map((locale) => [locale, typeof value[locale] === "string" ? value[locale] : ""])
  ) as ProductAttributeLocaleMap;
}

export function normalizeProductAttributeLocaleMapForSave(map: ProductAttributeLocaleMap): ProductAttributeLocaleMap {
  return Object.fromEntries(LOCALES.map((locale) => [locale, map[locale].trim()])) as ProductAttributeLocaleMap;
}

export function isProductAttributeLocaleMapComplete(map: ProductAttributeLocaleMap): boolean {
  return LOCALES.every((locale) => map[locale].trim() !== "");
}

export function formatProductAttributeLocaleMapChipExtras(
  map: ProductAttributeLocaleMap,
  primaryLocale: ProductAttributeLocaleCode = DEFAULT_LOCALE
): string[] {
  const primary = map[primaryLocale].trim();

  return LOCALES.filter((locale) => locale !== primaryLocale)
    .map((locale) => map[locale].trim())
    .filter((label) => label !== "" && label !== primary);
}

export function localeFillMap(map: ProductAttributeLocaleMap | undefined): Record<ProductAttributeLocaleCode, boolean> {
  return Object.fromEntries(LOCALES.map((locale) => [locale, (map?.[locale] ?? "").trim() !== ""]));
}

export function isProductAttributeLocaleCode(value: string): value is ProductAttributeLocaleCode {
  return (LOCALES as readonly string[]).includes(value);
}

export function resolveLocalizedString(map: ProductAttributeLocaleMap, locale: string): string {
  const normalized = isProductAttributeLocaleCode(locale) ? locale : DEFAULT_LOCALE;
  const primary = map[normalized].trim();
  if (primary !== "") {
    return primary;
  }

  const fallback = map[DEFAULT_LOCALE].trim();
  if (fallback !== "") {
    return fallback;
  }

  for (const code of LOCALES) {
    const candidate = map[code].trim();
    if (candidate !== "") {
      return candidate;
    }
  }

  return "";
}

export function resolveProductAttributeTitle(titles: ProductAttributeLocaleMap, locale: string): string {
  return resolveLocalizedString(titles, locale);
}

export function resolveAllowedValueLabel(entry: ProductAttributeAllowedValue, locale: string): string {
  const label = resolveLocalizedString(entry.labels, locale);
  return label === "" ? entry.value : label;
}

/** Comma-separated allowed-value labels for admin tables (select / multiselect only). */
export function formatAdminProductAttributeAllowedValuesList(
  options: Readonly<{
    allowedValues: readonly ProductAttributeAllowedValue[] | null | undefined;
    locale: string;
    type: ProductAttributeType;
  }>
): string {
  const { allowedValues, locale, type } = options;

  if (
    !productAttributeTypeUsesAllowedValues(type) ||
    allowedValues === null ||
    allowedValues === undefined ||
    allowedValues.length === ZERO_LENGTH
  ) {
    return "";
  }

  return allowedValues.map((entry) => resolveAllowedValueLabel(entry, locale)).join(ALLOWED_VALUES_DISPLAY_SEPARATOR);
}

export function isProductAttributeUnitPreset(value: string): value is ProductAttributeUnitPreset {
  return UNIT_PRESET_SET.has(value);
}

export function resolveProductAttributeUnitSelectValue(unit: string): string {
  const trimmed = unit.trim();
  if (trimmed === "") {
    return "";
  }

  return isProductAttributeUnitPreset(trimmed) ? trimmed : PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE;
}

export function parseMultiselectStoredValue(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string");
    }
  } catch {
    // Legacy comma-separated values.
  }

  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

export function stringifyMultiselectStoredValue(keys: readonly string[]): string {
  return JSON.stringify([...keys]);
}

export function parseProductAttributeValueForType(
  type: ProductAttributeType,
  raw: string,
  allowedValues?: ProductAttributeAllowedValue[] | null
): string {
  const trimmed = raw.trim();

  if (type === PRODUCT_ATTRIBUTE_TYPE.BOOLEAN) {
    if (trimmed === "true" || trimmed === "1" || trimmed.toLowerCase() === "yes") {
      return "true";
    }
    if (trimmed === "false" || trimmed === "0" || trimmed === "" || trimmed.toLowerCase() === "no") {
      return "false";
    }
    return trimmed;
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.SELECT && allowedValues !== undefined && allowedValues !== null) {
    const match = allowedValues.find((entry) => entry.value === trimmed);
    return match?.value ?? trimmed;
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.MULTISELECT) {
    const keys = parseMultiselectStoredValue(trimmed);
    return JSON.stringify(keys);
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.NUMBER) {
    return trimmed;
  }

  return raw;
}

export function formatProductAttributeValueForDisplay(
  type: ProductAttributeType,
  value: string,
  options: {
    readonly allowedValues?: readonly ProductAttributeAllowedValue[] | null;
    readonly locale: string;
    readonly unit?: string | null;
  }
): string {
  const { allowedValues, locale, unit } = options;

  if (type === PRODUCT_ATTRIBUTE_TYPE.BOOLEAN) {
    return value === "true" ? "Yes" : "No";
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.SELECT && allowedValues !== null && allowedValues !== undefined) {
    const entry = allowedValues.find((item) => item.value === value);
    return entry === undefined ? value : resolveAllowedValueLabel(entry, locale);
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.MULTISELECT && allowedValues !== null && allowedValues !== undefined) {
    return parseMultiselectStoredValue(value)
      .map((key) => {
        const entry = allowedValues.find((item) => item.value === key);
        return entry === undefined ? key : resolveAllowedValueLabel(entry, locale);
      })
      .join(MULTISELECT_SEPARATOR);
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.NUMBER && unit !== undefined && unit !== null && unit !== "") {
    return `${value} ${unit}`;
  }

  return value;
}

export function productAttributeTypeHasAllowedValues(type: ProductAttributeType): boolean {
  return productAttributeTypeUsesAllowedValues(type);
}

const ZERO_COUNT = 0;

export function computeProductAttributeStats(items: readonly ProductAttribute["adminListItem"][]): ProductAttribute["stats"] {
  let inUse = ZERO_COUNT;
  let unused = ZERO_COUNT;
  let withChoices = ZERO_COUNT;

  for (const row of items) {
    if (row.productCount > ZERO_COUNT) {
      inUse++;
    } else {
      unused++;
    }

    if (productAttributeTypeUsesAllowedValues(row.type)) {
      withChoices++;
    }
  }

  return {
    inUse,
    total: items.length,
    unused,
    withChoices
  };
}

export function filterAdminProductAttributesByStat(
  items: readonly ProductAttribute["adminListItem"][],
  filter: ProductAttributeStatFilter | undefined
): ProductAttribute["adminListItem"][] {
  if (filter === undefined) {
    return [...items];
  }

  switch (filter) {
    case PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE: {
      return items.filter((row) => row.productCount > ZERO_COUNT);
    }
    case PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED: {
      return items.filter((row) => row.productCount === ZERO_COUNT);
    }
    case PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE: {
      return items.filter((row) => productAttributeTypeUsesAllowedValues(row.type));
    }
  }
}
