import { z } from "zod/v4"

import { DEFAULT_LOCALE, LOCALES } from "~/src/integrations/use-intl/i18n.config"

import {
  PRODUCT_ATTRIBUTE_STAT_FILTER,
  PRODUCT_ATTRIBUTE_TYPE,
  PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE,
  PRODUCT_ATTRIBUTE_UNIT_PRESETS,
  type ProductAttributeStatFilter,
  type ProductAttributeType,
  type ProductAttributeUnitPreset,
  productAttributeTypeUsesAllowedValues,
} from "~/src/modules/product-attribute/product-attribute.constants"
import {
  type ProductAttribute,
  type ProductAttributeAllowedValue,
  type ProductAttributeLocaleCode,
  type ProductAttributeLocaleMap,
} from "~/src/modules/product-attribute/product-attribute.types"

const MULTISELECT_SEPARATOR = ", "

const ALLOWED_VALUES_DISPLAY_SEPARATOR = ", "

const UNIT_PRESET_SET = new Set<string>(PRODUCT_ATTRIBUTE_UNIT_PRESETS)

const rawAllowedValueSchema = z.object({
  labels: z.record(z.string(), z.string()),
  value: z.string(),
})

const rawAllowedValuesCoerceSchema = z.array(rawAllowedValueSchema)

export const coerceProductAttributeAllowedValues = (value: unknown): ProductAttributeAllowedValue[] | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }
  const parsed = rawAllowedValuesCoerceSchema.safeParse(value)
  if (!parsed.success) {
    return undefined
  }
  return parsed.data.map((entry) => ({
    labels: coerceProductAttributeLocaleMap(entry.labels),
    value: entry.value,
  }))
}

export const createEmptyProductAttributeLocaleMap = (): ProductAttributeLocaleMap =>
  Object.fromEntries(LOCALES.map((locale) => [locale, ""]))

export const coerceProductAttributeLocaleMap = (
  value: Partial<ProductAttributeLocaleMap> | null | undefined,
): ProductAttributeLocaleMap => {
  const empty = createEmptyProductAttributeLocaleMap()
  if (value === null || value === undefined || typeof value !== "object") {
    return empty
  }
  return Object.fromEntries(LOCALES.map((locale) => [locale, typeof value[locale] === "string" ? value[locale] : ""]))
}

export const normalizeProductAttributeLocaleMapForSave = (map: ProductAttributeLocaleMap): ProductAttributeLocaleMap =>
  Object.fromEntries(LOCALES.map((locale) => [locale, map[locale].trim()]))

export const isProductAttributeLocaleMapComplete = (map: ProductAttributeLocaleMap): boolean =>
  LOCALES.every((locale) => map[locale].trim() !== "")

export const formatProductAttributeLocaleMapChipExtras = (
  map: ProductAttributeLocaleMap,
  primaryLocale: ProductAttributeLocaleCode = DEFAULT_LOCALE,
): string[] => {
  const primary = map[primaryLocale].trim()
  return LOCALES.filter((locale) => locale !== primaryLocale)
    .map((locale) => map[locale].trim())
    .filter((label) => label !== "" && label !== primary)
}

export const localeFillMap = (map: ProductAttributeLocaleMap | undefined): Record<ProductAttributeLocaleCode, boolean> =>
  Object.fromEntries(LOCALES.map((locale) => [locale, (map?.[locale] ?? "").trim() !== ""]))

export const isProductAttributeLocaleCode = (value: string): value is ProductAttributeLocaleCode =>
  (LOCALES as readonly string[]).includes(value)

export const resolveLocalizedString = (map: ProductAttributeLocaleMap, locale: string): string => {
  const normalized = isProductAttributeLocaleCode(locale) ? locale : DEFAULT_LOCALE
  const primary = map[normalized].trim()
  if (primary !== "") {
    return primary
  }
  const fallback = map[DEFAULT_LOCALE].trim()
  if (fallback !== "") {
    return fallback
  }
  for (const code of LOCALES) {
    const candidate = map[code].trim()
    if (candidate !== "") {
      return candidate
    }
  }
  return ""
}

export const resolveProductAttributeTitle = (titles: ProductAttributeLocaleMap, locale: string): string =>
  resolveLocalizedString(titles, locale)

export const resolveAllowedValueLabel = (entry: ProductAttributeAllowedValue, locale: string): string => {
  const label = resolveLocalizedString(entry.labels, locale)
  return label === "" ? entry.value : label
}

/** Comma-separated allowed-value labels for admin tables (select / multiselect only). */
export const formatAdminProductAttributeAllowedValuesList = (
  options: Readonly<{
    allowedValues: readonly ProductAttributeAllowedValue[] | null | undefined
    locale: string
    type: ProductAttributeType
  }>,
): string => {
  const { allowedValues, locale, type } = options
  if (!productAttributeTypeUsesAllowedValues(type) || allowedValues === null || allowedValues === undefined || allowedValues.length === 0) {
    return ""
  }
  return allowedValues.map((entry) => resolveAllowedValueLabel(entry, locale)).join(ALLOWED_VALUES_DISPLAY_SEPARATOR)
}

export const isProductAttributeUnitPreset = (value: string): value is ProductAttributeUnitPreset => UNIT_PRESET_SET.has(value)

export const resolveProductAttributeUnitSelectValue = (unit: string): string => {
  const trimmed = unit.trim()
  if (trimmed === "") {
    return ""
  }
  return isProductAttributeUnitPreset(trimmed) ? trimmed : PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE
}

export const parseMultiselectStoredValue = (raw: string): string[] => {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string")
    }
  } catch {
    // Legacy comma-separated values.
  }
  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
}

export const stringifyMultiselectStoredValue = (keys: readonly string[]): string => JSON.stringify([...keys])

export const parseProductAttributeValueForType = (
  type: ProductAttributeType,
  raw: string,
  allowedValues?: ProductAttributeAllowedValue[] | null,
): string => {
  const trimmed = raw.trim()
  if (type === PRODUCT_ATTRIBUTE_TYPE.BOOLEAN) {
    if (trimmed === "true" || trimmed === "1" || trimmed.toLowerCase() === "yes") {
      return "true"
    }
    if (trimmed === "false" || trimmed === "0" || trimmed === "" || trimmed.toLowerCase() === "no") {
      return "false"
    }
    return trimmed
  }
  if (type === PRODUCT_ATTRIBUTE_TYPE.SELECT && allowedValues !== undefined && allowedValues !== null) {
    const match = allowedValues.find((entry) => entry.value === trimmed)
    return match?.value ?? trimmed
  }
  if (type === PRODUCT_ATTRIBUTE_TYPE.MULTISELECT) {
    const keys = parseMultiselectStoredValue(trimmed)
    return JSON.stringify(keys)
  }
  if (type === PRODUCT_ATTRIBUTE_TYPE.NUMBER) {
    return trimmed
  }
  return raw
}

export const formatProductAttributeValueForDisplay = (
  type: ProductAttributeType,
  value: string,
  options: {
    readonly allowedValues?: readonly ProductAttributeAllowedValue[] | null
    readonly locale: string
    readonly unit?: string | null
  },
): string => {
  const { allowedValues, locale, unit } = options
  if (type === PRODUCT_ATTRIBUTE_TYPE.BOOLEAN) {
    return value === "true" ? "Yes" : "No"
  }
  if (type === PRODUCT_ATTRIBUTE_TYPE.SELECT && allowedValues !== null && allowedValues !== undefined) {
    const entry = allowedValues.find((item) => item.value === value)
    return entry === undefined ? value : resolveAllowedValueLabel(entry, locale)
  }
  if (type === PRODUCT_ATTRIBUTE_TYPE.MULTISELECT && allowedValues !== null && allowedValues !== undefined) {
    return parseMultiselectStoredValue(value)
      .map((key) => {
        const entry = allowedValues.find((item) => item.value === key)
        return entry === undefined ? key : resolveAllowedValueLabel(entry, locale)
      })
      .join(MULTISELECT_SEPARATOR)
  }
  if (type === PRODUCT_ATTRIBUTE_TYPE.NUMBER && unit !== undefined && unit !== null && unit !== "") {
    return `${value} ${unit}`
  }
  return value
}

export const productAttributeTypeHasAllowedValues = (type: ProductAttributeType): boolean => productAttributeTypeUsesAllowedValues(type)

export const computeProductAttributeStats = (items: readonly ProductAttribute["adminListItem"][]): ProductAttribute["stats"] => {
  let inUse = 0
  let unused = 0
  let withChoices = 0
  for (const row of items) {
    if (row.productCount > 0) {
      inUse++
    } else {
      unused++
    }
    if (productAttributeTypeUsesAllowedValues(row.type)) {
      withChoices++
    }
  }
  return {
    inUse,
    total: items.length,
    unused,
    withChoices,
  }
}

export const filterAdminProductAttributesByStat = (
  items: readonly ProductAttribute["adminListItem"][],
  filter: ProductAttributeStatFilter | undefined,
): ProductAttribute["adminListItem"][] => {
  if (filter === PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE) {
    return items.filter((row) => row.productCount > 0)
  }
  if (filter === PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED) {
    return items.filter((row) => row.productCount === 0)
  }
  if (filter === PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE) {
    return items.filter((row) => productAttributeTypeUsesAllowedValues(row.type))
  }
  return [...items]
}

export const normalizeAllowedValuesForSave = (allowedValues: ProductAttributeAllowedValue[]): ProductAttributeAllowedValue[] =>
  allowedValues.map((entry) => ({
    labels: normalizeProductAttributeLocaleMapForSave(entry.labels),
    value: entry.value,
  }))
