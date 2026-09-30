import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"
import { resolveProductTitle } from "~/src/modules/product/product.utils"

export const DEFAULT_VARIANT_TITLE = "Default"

export const VARIANT_TITLE_SEPARATOR = " / "

export const MAX_PRODUCT_OPTIONS = 3

export interface ProductOptionValueDraft {
  readonly id?: string | undefined
  readonly labels: Product["localeMap"]
}

export interface ProductOptionDraft {
  readonly id?: string | undefined
  readonly titles: Product["localeMap"]
  readonly values: readonly ProductOptionValueDraft[]
}

export interface VariantCombination {
  readonly optionValues: Readonly<Record<string, string>>
  readonly title: string
}

export const buildVariantTitle = (optionValues: Readonly<Record<string, string>>): string => {
  const parts = Object.values(optionValues)
    .map((valueId) => valueId.trim())
    .filter((valueId) => valueId !== "")
  if (parts.length === 0) {
    return DEFAULT_VARIANT_TITLE
  }

  return parts.join(VARIANT_TITLE_SEPARATOR)
}

export const buildVariantDisplayTitle = (
  optionValues: Readonly<Record<string, string>>,
  options: readonly ProductOptionDraft[],
  locale: string,
): string => {
  const valueLabelById = new Map<string, string>()
  for (const option of options) {
    for (const value of option.values) {
      if (value.id !== undefined) {
        valueLabelById.set(value.id, resolveProductTitle(value.labels, locale))
      }
    }
  }

  const parts = Object.entries(optionValues)
    .map(([, valueId]) => valueLabelById.get(valueId) ?? valueId)
    .filter((label) => label.trim() !== "")
  if (parts.length === 0) {
    return DEFAULT_VARIANT_TITLE
  }

  return parts.join(VARIANT_TITLE_SEPARATOR)
}

export const buildVariantCombinationKey = (optionValues: Readonly<Record<string, string>>): string =>
  Object.entries(optionValues)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([optionId, valueId]) => `${optionId}=${valueId}`)
    .join("|")

const hasCompleteOptionTitles = (titles: Product["localeMap"]): boolean =>
  I18N.SUPPORTED_LOCALES.every((locale) => titles[locale].trim() !== "")

const normalizeOptionValueDraftsForForm = (values: readonly ProductOptionValueDraft[]): ProductOptionValueDraft[] =>
  values.map((value) => ({
    id: value.id,
    labels: Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, value.labels[locale].trim()])) as Product["localeMap"],
  }))

const normalizeOptionValueDrafts = (values: readonly ProductOptionValueDraft[]): ProductOptionValueDraft[] => {
  const seen = new Set<string>()

  return values
    .map((value) => ({
      id: value.id,
      labels: Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, value.labels[locale].trim()])) as Product["localeMap"],
    }))
    .filter((value) => {
      if (!I18N.SUPPORTED_LOCALES.every((locale) => value.labels[locale] !== "")) {
        return false
      }

      const key = I18N.SUPPORTED_LOCALES.map((locale) => value.labels[locale]).join("|")
      if (seen.has(key)) {
        return false
      }
      seen.add(key)

      return true
    })
}

const resolveCombinationValueKey = (value: ProductOptionValueDraft, index: number): string => {
  if (value.id !== undefined && value.id !== "") {
    return value.id
  }

  if (value.labels[I18N.DEFAULT_LOCALE] !== "") {
    return value.labels[I18N.DEFAULT_LOCALE]
  }

  return `__draft_${index}`
}

const buildVariantCombinationsFromNormalizedOptions = (
  normalized: readonly {
    readonly id?: string | undefined
    readonly titles: Product["localeMap"]
    readonly values: readonly ProductOptionValueDraft[]
  }[],
  useDraftKeys: boolean,
): VariantCombination[] => {
  if (normalized.length === 0) {
    return [
      {
        optionValues: {},
        title: DEFAULT_VARIANT_TITLE,
      },
    ]
  }

  return normalized.reduce<VariantCombination[]>((combinations, option) => {
    const optionId = option.id ?? option.titles[I18N.DEFAULT_LOCALE]
    if (combinations.length === 0) {
      return option.values.map((value, index) => {
        const valueKey = useDraftKeys ? resolveCombinationValueKey(value, index) : (value.id ?? value.labels[I18N.DEFAULT_LOCALE])

        return {
          optionValues: {
            [optionId]: valueKey,
          },
          title: value.labels[I18N.DEFAULT_LOCALE],
        }
      })
    }

    const next: VariantCombination[] = []
    for (const combination of combinations) {
      for (const [index, value] of option.values.entries()) {
        const valueKey = useDraftKeys ? resolveCombinationValueKey(value, index) : (value.id ?? value.labels[I18N.DEFAULT_LOCALE])
        const optionValues = {
          ...combination.optionValues,
          [optionId]: valueKey,
        }
        next.push({
          optionValues,
          title: buildVariantTitle(optionValues),
        })
      }
    }

    return next
  }, [])
}

export const buildVariantCombinationsFromFormDrafts = (options: readonly ProductOptionDraft[]): VariantCombination[] => {
  const normalized = options
    .map((option) => ({
      id: option.id,
      titles: option.titles,
      values: normalizeOptionValueDraftsForForm(option.values),
    }))
    .filter((option) => option.values.length > 0)
  return buildVariantCombinationsFromNormalizedOptions(normalized, true)
}

export const buildVariantCombinations = (options: readonly ProductOptionDraft[]): VariantCombination[] => {
  const normalized = options
    .map((option) => ({
      id: option.id,
      titles: option.titles,
      values: normalizeOptionValueDrafts(option.values),
    }))
    .filter((option) => hasCompleteOptionTitles(option.titles) && option.values.length > 0)
  return buildVariantCombinationsFromNormalizedOptions(normalized, false)
}

export const inferHasVariants = (
  options: readonly {
    readonly values?: readonly unknown[]
    readonly optionOnVariants?: readonly {
      readonly valueId: string
    }[]
  }[],
  variantCount: number,
): boolean => {
  if (variantCount > PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD) {
    return true
  }

  return options.some((option) => {
    if (option.values !== undefined) {
      return option.values.length > PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD
    }

    const uniqueValues = new Set(option.optionOnVariants?.map((row) => row.valueId))

    return uniqueValues.size > PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD
  })
}

export const normalizeOptionDrafts = (options: readonly ProductOptionDraft[]): ProductOptionDraft[] =>
  options
    .map((option) => ({
      id: option.id,
      titles: Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, option.titles[locale].trim()])) as Product["localeMap"],
      values: normalizeOptionValueDrafts(option.values),
    }))
    .filter((option) => hasCompleteOptionTitles(option.titles) && option.values.length > 0)
    .slice(0, MAX_PRODUCT_OPTIONS)

export const resolveVariantOptionValueIds = (variant: {
  readonly optionOnVariants?: readonly {
    readonly option: {
      readonly id: string
    }
    readonly value: {
      readonly id: string
    }
  }[]
}): Record<string, string> => {
  const rows = variant.optionOnVariants ?? []

  return Object.fromEntries(rows.map((row) => [row.option.id, row.value.id]))
}
