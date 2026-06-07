import { v7 as uuidv7 } from "uuid";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils";
import {
  buildVariantCombinationKey,
  type ProductOptionDraft,
  type ProductOptionValueDraft
} from "~/src/modules/product-variant/product-variant.utils";
import type { ProductLocaleMap } from "~/src/modules/product/product.types";

export const IMPLICIT_VARIANT_OPTION_TITLES: ProductLocaleMap = {
  en: "Variant",
  pl: "Wariant"
};

const EMPTY_LENGTH = 0;
const NOT_FOUND_INDEX = -1;

export function createDraftOptionValueId(): string {
  return uuidv7();
}

export function createImplicitVariantOptionSetup(): ProductFormValues["options"][number] {
  return {
    titles: { ...IMPLICIT_VARIANT_OPTION_TITLES },
    values: [{ id: createDraftOptionValueId(), labels: createEmptyProductAttributeLocaleMap() }]
  };
}

export function isImplicitVariantOptionTitles(titles: ProductLocaleMap): boolean {
  return titles.pl === IMPLICIT_VARIANT_OPTION_TITLES.pl && titles.en === IMPLICIT_VARIANT_OPTION_TITLES.en;
}

export function ensureImplicitVariantOptions(options: readonly ProductOptionDraft[]): ProductFormValues["options"] {
  if (options.length === EMPTY_LENGTH) {
    return [createImplicitVariantOptionSetup()];
  }

  const [firstOption, ...rest] = options;
  if (rest.length > EMPTY_LENGTH) {
    return options.map((option) => ({
      id: option.id,
      titles: { ...option.titles },
      values: option.values.map((value) => ({
        id: value.id,
        labels: { ...value.labels }
      }))
    }));
  }

  const values =
    firstOption.values.length === EMPTY_LENGTH
      ? [{ id: createDraftOptionValueId(), labels: createEmptyProductAttributeLocaleMap() }]
      : [...firstOption.values];

  return [
    {
      ...firstOption,
      titles: hasAnyOptionTitle(firstOption.titles) ? firstOption.titles : { ...IMPLICIT_VARIANT_OPTION_TITLES },
      values
    }
  ];
}

function hasAnyOptionTitle(titles: ProductLocaleMap): boolean {
  return titles.pl.trim() !== "" || titles.en.trim() !== "";
}

export function resolveFormOptionValueKey(value: ProductOptionValueDraft, index: number): string {
  if (value.id !== undefined && value.id !== "") {
    return value.id;
  }

  if (value.labels[DEFAULT_LOCALE] !== "") {
    return value.labels[DEFAULT_LOCALE];
  }

  return `__draft_${index}`;
}

/** Maps an option-value row index to the matching variant form row (by combination key, not array position). */
export function resolveFormVariantIndexForValueRow(
  valueIndex: number,
  options: ProductFormValues["options"],
  variants: ProductFormValues["variants"]
): number {
  const [option] = options;
  if (option === undefined) {
    return valueIndex;
  }

  const value = option.values[valueIndex];
  if (value === undefined) {
    return valueIndex;
  }

  const optionId = option.id ?? option.titles[DEFAULT_LOCALE];
  const valueKey = resolveFormOptionValueKey(value, valueIndex);
  const combinationKey = buildVariantCombinationKey({ [optionId]: valueKey });
  const matchedIndex = variants.findIndex((variant) => buildVariantCombinationKey(variant.optionValues) === combinationKey);

  if (matchedIndex !== NOT_FOUND_INDEX) {
    return matchedIndex;
  }

  return valueIndex < variants.length ? valueIndex : NOT_FOUND_INDEX;
}
