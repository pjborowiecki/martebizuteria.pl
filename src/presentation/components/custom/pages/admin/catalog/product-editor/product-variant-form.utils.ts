import { v7 as uuidv7 } from "uuid"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"

import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils"
import {
  type ProductOptionDraft,
  type ProductOptionValueDraft,
  buildVariantCombinationKey,
} from "~/src/modules/product-variant/product-variant.utils"
import { type ProductLocaleMap } from "~/src/modules/product/product.types"
import { type ProductFormValues } from "~/src/modules/product/product.zod"
export const createDraftOptionValueId = (): string => uuidv7()

export const createImplicitVariantOptionSetup = (): ProductFormOption => ({
  titles: {
    ...IMPLICIT_VARIANT_OPTION_TITLES,
  },
  values: [
    {
      id: createDraftOptionValueId(),
      labels: createEmptyProductAttributeLocaleMap(),
    },
  ],
})
export const isImplicitVariantOptionTitles = (titles: ProductLocaleMap): boolean =>
  titles.pl === IMPLICIT_VARIANT_OPTION_TITLES.pl && titles.en === IMPLICIT_VARIANT_OPTION_TITLES.en

const cloneOptionDraft = (option: ProductOptionDraft): ProductFormOption => ({
  id: option.id,
  titles: {
    ...option.titles,
  },
  values: option.values.map((value) => ({
    id: value.id,
    labels: {
      ...value.labels,
    },
  })),
})

export const ensureImplicitVariantOptions = (options: readonly ProductOptionDraft[]): [ProductFormOption, ...ProductFormOption[]] => {
  const [firstOption, ...rest] = options
  if (firstOption === undefined) {
    return [createImplicitVariantOptionSetup()]
  }
  if (rest.length > 0) {
    return [cloneOptionDraft(firstOption), ...rest.map((option) => cloneOptionDraft(option))]
  }
  const values =
    firstOption.values.length === 0
      ? [
          {
            id: createDraftOptionValueId(),
            labels: createEmptyProductAttributeLocaleMap(),
          },
        ]
      : [...firstOption.values]
  return [
    {
      ...firstOption,
      titles: hasAnyOptionTitle(firstOption.titles)
        ? firstOption.titles
        : {
            ...IMPLICIT_VARIANT_OPTION_TITLES,
          },
      values,
    },
  ]
}
const hasAnyOptionTitle = (titles: ProductLocaleMap): boolean => titles.pl.trim() !== "" || titles.en.trim() !== ""

export const resolveFormOptionValueKey = (value: ProductOptionValueDraft, index: number): string => {
  if (value.id !== undefined && value.id !== "") {
    return value.id
  }
  if (value.labels[DEFAULT_LOCALE] !== "") {
    return value.labels[DEFAULT_LOCALE]
  }
  return `__draft_${index}`
}

/** Maps an option-value row index to the matching variant form row (by combination key, not array position). */
export const resolveFormVariantIndexForValueRow = (
  valueIndex: number,
  options: ProductFormValues["options"],
  variants: ProductFormValues["variants"],
): number => {
  const [option] = options
  if (option === undefined) {
    return valueIndex
  }
  const value = option.values[valueIndex]
  if (value === undefined) {
    return valueIndex
  }
  const optionId = option.id ?? option.titles[DEFAULT_LOCALE]
  const valueKey = resolveFormOptionValueKey(value, valueIndex)
  const combinationKey = buildVariantCombinationKey({
    [optionId]: valueKey,
  })
  const matchedIndex = variants.findIndex((variant) => buildVariantCombinationKey(variant.optionValues) === combinationKey)
  if (matchedIndex !== NOT_FOUND_INDEX) {
    return matchedIndex
  }
  return valueIndex < variants.length ? valueIndex : NOT_FOUND_INDEX
}
export const IMPLICIT_VARIANT_OPTION_TITLES: ProductLocaleMap = {
  en: "Variant",
  pl: "Wariant",
}
const NOT_FOUND_INDEX = -1
type ProductFormOption = ProductFormValues["options"][number]
