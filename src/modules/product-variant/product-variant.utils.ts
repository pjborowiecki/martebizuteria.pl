export const DEFAULT_VARIANT_TITLE = "Default";
export const VARIANT_TITLE_SEPARATOR = " / ";
export const MAX_PRODUCT_OPTIONS = 3;
const MULTI_VARIANT_THRESHOLD = 1;

const EMPTY_LENGTH = 0;

export interface ProductOptionDraft {
  readonly id?: string;
  readonly title: string;
  readonly values: readonly string[];
}

export interface VariantCombination {
  readonly optionValues: Readonly<Record<string, string>>;
  readonly title: string;
}

export function buildVariantTitle(optionValues: Readonly<Record<string, string>>): string {
  const parts = Object.values(optionValues).filter((value) => value.trim() !== "");
  if (parts.length === EMPTY_LENGTH) {
    return DEFAULT_VARIANT_TITLE;
  }

  return parts.join(VARIANT_TITLE_SEPARATOR);
}

export function buildVariantCombinationKey(optionValues: Readonly<Record<string, string>>): string {
  return Object.entries(optionValues)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([optionTitle, value]) => `${optionTitle}=${value}`)
    .join("|");
}

export function buildVariantCombinations(options: readonly ProductOptionDraft[]): VariantCombination[] {
  const normalized = options
    .map((option) => ({
      title: option.title.trim(),
      values: [...new Set(option.values.map((value) => value.trim()).filter((value) => value !== ""))]
    }))
    .filter((option) => option.title !== "" && option.values.length > EMPTY_LENGTH);

  if (normalized.length === EMPTY_LENGTH) {
    return [{ optionValues: {}, title: DEFAULT_VARIANT_TITLE }];
  }

  return normalized.reduce<VariantCombination[]>((combinations, option) => {
    if (combinations.length === EMPTY_LENGTH) {
      return option.values.map((value) => ({
        optionValues: { [option.title]: value },
        title: value
      }));
    }

    const next: VariantCombination[] = [];
    for (const combination of combinations) {
      for (const value of option.values) {
        const optionValues = { ...combination.optionValues, [option.title]: value };
        next.push({
          optionValues,
          title: buildVariantTitle(optionValues)
        });
      }
    }

    return next;
  }, []);
}

export function inferHasVariants(
  options: readonly { readonly optionOnVariants: readonly { readonly value: string }[] }[],
  variantCount: number
): boolean {
  if (variantCount > MULTI_VARIANT_THRESHOLD) {
    return true;
  }

  return options.some((option) => {
    const uniqueValues = new Set(option.optionOnVariants.map((row) => row.value.trim()).filter((value) => value !== ""));
    return uniqueValues.size > MULTI_VARIANT_THRESHOLD;
  });
}

export function normalizeOptionDrafts(options: readonly ProductOptionDraft[]): ProductOptionDraft[] {
  return options
    .map((option) => ({
      id: option.id,
      title: option.title.trim(),
      values: [...new Set(option.values.map((value) => value.trim()).filter((value) => value !== ""))]
    }))
    .filter((option) => option.title !== "" && option.values.length > EMPTY_LENGTH)
    .slice(EMPTY_LENGTH, MAX_PRODUCT_OPTIONS);
}
