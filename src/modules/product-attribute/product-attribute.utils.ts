import { I18N } from "~/src/integrations/use-intl/i18n.config"

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
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

const MULTISELECT_SEPARATOR = ", "

const ALLOWED_VALUES_DISPLAY_SEPARATOR = ", "

const UNIT_PRESET_SET = new Set<string>(PRODUCT_ATTRIBUTE_UNIT_PRESETS)

export const coerceProductAttributeAllowedValues = (value: unknown): ProductAttribute["allowedValue"][] | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  const parsed = productAttributeZodSchemas.rawAllowedValues.safeParse(value)
  if (!parsed.success) {
    return undefined
  }

  return parsed.data.map((entry) => ({
    labels: coerceProductAttributeLocaleMap(entry.labels),
    value: entry.value,
  }))
}

export const createEmptyProductAttributeLocaleMap = (): ProductAttribute["localeMap"] =>
  Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, ""]))

const parseSerializedLocaleMap = (value: string): unknown => {
  if (!value.startsWith("{")) {
    return undefined
  }

  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

export const coerceProductAttributeLocaleMap = (value: unknown): ProductAttribute["localeMap"] => {
  if (typeof value === "string") {
    return coerceProductAttributeLocaleMap(parseSerializedLocaleMap(value) ?? { [I18N.DEFAULT_LOCALE]: value })
  }

  const parsed = productAttributeZodSchemas.rawLocaleMap.safeParse(value)
  if (!parsed.success || Array.isArray(value)) {
    return createEmptyProductAttributeLocaleMap()
  }

  return Object.fromEntries(
    I18N.SUPPORTED_LOCALES.map((locale) => [locale, typeof parsed.data[locale] === "string" ? parsed.data[locale] : ""]),
  )
}

export const normalizeProductAttributeLocaleMapForSave = (map: ProductAttribute["localeMap"]): ProductAttribute["localeMap"] =>
  Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, map[locale].trim()]))

export const isProductAttributeLocaleMapComplete = (map: ProductAttribute["localeMap"]): boolean =>
  I18N.SUPPORTED_LOCALES.every((locale) => map[locale].trim() !== "")

export const formatProductAttributeLocaleMapChipExtras = (
  map: ProductAttribute["localeMap"],
  primaryLocale: ProductAttribute["localeCode"] = I18N.DEFAULT_LOCALE,
): string[] => {
  const primary = map[primaryLocale].trim()

  return I18N.SUPPORTED_LOCALES.filter((locale) => locale !== primaryLocale)
    .map((locale) => map[locale].trim())
    .filter((label) => label !== "" && label !== primary)
}

export const localeFillMap = (map: ProductAttribute["localeMap"] | undefined): Record<ProductAttribute["localeCode"], boolean> =>
  Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, (map?.[locale] ?? "").trim() !== ""]))

export const isProductAttributeLocaleCode = (value: string): value is ProductAttribute["localeCode"] =>
  (I18N.SUPPORTED_LOCALES as readonly string[]).includes(value)

export const resolveLocalizedString = (map: ProductAttribute["localeMap"], locale: string): string => {
  const normalized = isProductAttributeLocaleCode(locale) ? locale : I18N.DEFAULT_LOCALE
  const primary = map[normalized].trim()
  if (primary !== "") {
    return primary
  }

  const fallback = map[I18N.DEFAULT_LOCALE].trim()
  if (fallback !== "") {
    return fallback
  }

  for (const code of I18N.SUPPORTED_LOCALES) {
    const candidate = map[code].trim()
    if (candidate !== "") {
      return candidate
    }
  }

  return ""
}

export const resolveProductAttributeTitle = (titles: ProductAttribute["localeMap"], locale: string): string =>
  resolveLocalizedString(titles, locale)

export const resolveAllowedValueLabel = (entry: ProductAttribute["allowedValue"], locale: string): string => {
  const label = resolveLocalizedString(entry.labels, locale)

  return label === "" ? entry.value : label
}

export const formatAdminProductAttributeAllowedValuesList = (
  options: Readonly<{
    allowedValues: readonly ProductAttribute["allowedValue"][] | null | undefined
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
  } catch {}

  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
}

export const stringifyMultiselectStoredValue = (keys: readonly string[]): string => JSON.stringify([...keys])

export const parseProductAttributeValueForType = (
  type: ProductAttributeType,
  raw: string,
  allowedValues?: ProductAttribute["allowedValue"][] | null,
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
    readonly allowedValues?: readonly ProductAttribute["allowedValue"][] | null
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

export const normalizeAllowedValuesForSave = (allowedValues: ProductAttribute["allowedValue"][]): ProductAttribute["allowedValue"][] =>
  allowedValues.map((entry) => ({
    labels: normalizeProductAttributeLocaleMapForSave(entry.labels),
    value: entry.value,
  }))
