import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";

import {
  coerceProductAttributeLocaleMap,
  createEmptyProductAttributeLocaleMap,
  normalizeProductAttributeLocaleMapForSave,
  resolveLocalizedString
} from "~/src/modules/product-attribute/product-attribute.utils";
import type { Collection, CollectionLocaleMap } from "~/src/modules/product-collection/product-collection.types";

const ZERO_COUNT = 0;
const AVG_DECIMALS = 10;

export function coerceCollectionLocaleMap(value: unknown): CollectionLocaleMap {
  if (typeof value === "string") {
    return coerceProductAttributeLocaleMap({ [DEFAULT_LOCALE]: value });
  }

  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyProductAttributeLocaleMap();
  }

  return coerceProductAttributeLocaleMap(value as Partial<CollectionLocaleMap>);
}

export function normalizeOptionalCollectionLocaleMapForSave(map: CollectionLocaleMap): CollectionLocaleMap | undefined {
  const normalized = normalizeProductAttributeLocaleMapForSave(map);
  if (LOCALES.every((locale) => normalized[locale] === "")) {
    return undefined;
  }
  return normalized;
}

export function resolveCollectionTitle(titles: unknown, locale: string): string {
  return resolveLocalizedString(coerceCollectionLocaleMap(titles), locale);
}

export function resolveCollectionDescription(descriptions: unknown, locale: string): string {
  return resolveLocalizedString(coerceCollectionLocaleMap(descriptions), locale);
}

export function toAdminCollectionListItem(row: Collection["select"], productCount: number): Collection["adminListItem"] {
  return {
    ...row,
    productCount,
    titles: coerceCollectionLocaleMap(row.titles)
  };
}

export function toCollectionRow(input: Collection["createInput"], id: string, rank: number): Collection["insert"] {
  return {
    descriptions: normalizeOptionalCollectionLocaleMapForSave(input.descriptions),
    handle: input.handle,
    id,
    image: input.image === "" ? undefined : input.image,
    rank,
    status: input.status,
    titles: normalizeProductAttributeLocaleMapForSave(input.titles)
  };
}

export function computeCollectionStats(
  counts: { active: number; draft: number; total: number } | undefined,
  productTotal: number
): Collection["stats"] {
  const total = counts?.total ?? ZERO_COUNT;
  const avgProducts = total === ZERO_COUNT ? ZERO_COUNT : Math.round((productTotal / total) * AVG_DECIMALS) / AVG_DECIMALS;

  return {
    active: counts?.active ?? ZERO_COUNT,
    avgProducts,
    draft: counts?.draft ?? ZERO_COUNT,
    total
  };
}
