import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";

import { resolveProductOptionValueLabel } from "~/src/modules/product-option-value/product-option-value.utils";
import type { ProductLocaleMap } from "~/src/modules/product/product.types";

export const DEFAULT_VARIANT_TITLE = "Default";
export const VARIANT_TITLE_SEPARATOR = " / ";
export const MAX_PRODUCT_OPTIONS = 3;
const MULTI_VARIANT_THRESHOLD = 1;

const EMPTY_LENGTH = 0;

export interface ProductOptionValueDraft {
  readonly id?: string;
  readonly labels: ProductLocaleMap;
}

export interface ProductOptionDraft {
  readonly id?: string;
  readonly titles: ProductLocaleMap;
  readonly values: readonly ProductOptionValueDraft[];
}

export interface VariantCombination {
  readonly optionValues: Readonly<Record<string, string>>;
  readonly title: string;
}

export function buildVariantTitle(optionValues: Readonly<Record<string, string>>): string {
  const parts = Object.values(optionValues)
    .map((valueId) => valueId.trim())
    .filter((valueId) => valueId !== "");
  if (parts.length === EMPTY_LENGTH) {
    return DEFAULT_VARIANT_TITLE;
  }

  return parts.join(VARIANT_TITLE_SEPARATOR);
}

export function buildVariantDisplayTitle(
  optionValues: Readonly<Record<string, string>>,
  options: readonly ProductOptionDraft[],
  locale: string
): string {
  const valueLabelById = new Map<string, string>();
  for (const option of options) {
    for (const value of option.values) {
      if (value.id !== undefined) {
        valueLabelById.set(value.id, resolveProductOptionValueLabel(value.labels, locale));
      }
    }
  }

  const parts = Object.entries(optionValues)
    .map(([, valueId]) => valueLabelById.get(valueId) ?? valueId)
    .filter((label) => label.trim() !== "");

  if (parts.length === EMPTY_LENGTH) {
    return DEFAULT_VARIANT_TITLE;
  }

  return parts.join(VARIANT_TITLE_SEPARATOR);
}

export function buildVariantCombinationKey(optionValues: Readonly<Record<string, string>>): string {
  return Object.entries(optionValues)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([optionId, valueId]) => `${optionId}=${valueId}`)
    .join("|");
}

function hasCompleteOptionTitles(titles: ProductLocaleMap): boolean {
  return LOCALES.every((locale) => titles[locale].trim() !== "");
}

function normalizeOptionValueDraftsForForm(values: readonly ProductOptionValueDraft[]): ProductOptionValueDraft[] {
  return values.map((value) => ({
    id: value.id,
    labels: Object.fromEntries(LOCALES.map((locale) => [locale, value.labels[locale].trim()])) as ProductLocaleMap
  }));
}

function normalizeOptionValueDrafts(values: readonly ProductOptionValueDraft[]): ProductOptionValueDraft[] {
  const seen = new Set<string>();

  return values
    .map((value) => ({
      id: value.id,
      labels: Object.fromEntries(LOCALES.map((locale) => [locale, value.labels[locale].trim()])) as ProductLocaleMap
    }))
    .filter((value) => {
      if (!LOCALES.every((locale) => value.labels[locale] !== "")) {
        return false;
      }

      const key = LOCALES.map((locale) => value.labels[locale]).join("|");
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function resolveCombinationValueKey(value: ProductOptionValueDraft, index: number): string {
  if (value.id !== undefined && value.id !== "") {
    return value.id;
  }

  if (value.labels[DEFAULT_LOCALE] !== "") {
    return value.labels[DEFAULT_LOCALE];
  }

  return `__draft_${index}`;
}

function buildVariantCombinationsFromNormalizedOptions(
  normalized: readonly {
    readonly id?: string;
    readonly titles: ProductLocaleMap;
    readonly values: readonly ProductOptionValueDraft[];
  }[],
  useDraftKeys: boolean
): VariantCombination[] {
  if (normalized.length === EMPTY_LENGTH) {
    return [{ optionValues: {}, title: DEFAULT_VARIANT_TITLE }];
  }

  return normalized.reduce<VariantCombination[]>((combinations, option) => {
    const optionId = option.id ?? option.titles[DEFAULT_LOCALE];

    if (combinations.length === EMPTY_LENGTH) {
      return option.values.map((value, index) => {
        const valueKey = useDraftKeys ? resolveCombinationValueKey(value, index) : (value.id ?? value.labels[DEFAULT_LOCALE]);
        return {
          optionValues: { [optionId]: valueKey },
          title: value.labels[DEFAULT_LOCALE]
        };
      });
    }

    const next: VariantCombination[] = [];
    for (const combination of combinations) {
      for (const [index, value] of option.values.entries()) {
        const valueKey = useDraftKeys ? resolveCombinationValueKey(value, index) : (value.id ?? value.labels[DEFAULT_LOCALE]);
        const optionValues = { ...combination.optionValues, [optionId]: valueKey };
        next.push({
          optionValues,
          title: buildVariantTitle(optionValues)
        });
      }
    }

    return next;
  }, []);
}

/** Lenient draft normalization for the admin form — one row per named variant. */
export function buildVariantCombinationsFromFormDrafts(options: readonly ProductOptionDraft[]): VariantCombination[] {
  const normalized = options
    .map((option) => ({
      id: option.id,
      titles: option.titles,
      values: normalizeOptionValueDraftsForForm(option.values)
    }))
    .filter((option) => option.values.length > EMPTY_LENGTH);

  return buildVariantCombinationsFromNormalizedOptions(normalized, true);
}

export function buildVariantCombinations(options: readonly ProductOptionDraft[]): VariantCombination[] {
  const normalized = options
    .map((option) => ({
      id: option.id,
      titles: option.titles,
      values: normalizeOptionValueDrafts(option.values)
    }))
    .filter((option) => hasCompleteOptionTitles(option.titles) && option.values.length > EMPTY_LENGTH);

  return buildVariantCombinationsFromNormalizedOptions(normalized, false);
}

export function inferHasVariants(
  options: readonly { readonly values?: readonly unknown[]; readonly optionOnVariants?: readonly { readonly valueId: string }[] }[],
  variantCount: number
): boolean {
  if (variantCount > MULTI_VARIANT_THRESHOLD) {
    return true;
  }

  return options.some((option) => {
    if (option.values !== undefined) {
      return option.values.length > MULTI_VARIANT_THRESHOLD;
    }

    const uniqueValues = new Set(option.optionOnVariants?.map((row) => row.valueId));
    return uniqueValues.size > MULTI_VARIANT_THRESHOLD;
  });
}

export function normalizeOptionDrafts(options: readonly ProductOptionDraft[]): ProductOptionDraft[] {
  return options
    .map((option) => ({
      id: option.id,
      titles: Object.fromEntries(LOCALES.map((locale) => [locale, option.titles[locale].trim()])) as ProductLocaleMap,
      values: normalizeOptionValueDrafts(option.values)
    }))
    .filter((option) => hasCompleteOptionTitles(option.titles) && option.values.length > EMPTY_LENGTH)
    .slice(EMPTY_LENGTH, MAX_PRODUCT_OPTIONS);
}

export function resolveVariantOptionValueIds(variant: {
  readonly optionOnVariants?: readonly {
    readonly option: { readonly id: string };
    readonly value: { readonly id: string };
  }[];
}): Record<string, string> {
  const rows = variant.optionOnVariants ?? [];
  return Object.fromEntries(rows.map((row) => [row.option.id, row.value.id]));
}
