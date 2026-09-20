import { DEFAULT_LOCALE, LOCALES } from "~/src/integrations/use-intl/i18n.config"

import {
  coerceProductAttributeLocaleMap,
  createEmptyProductAttributeLocaleMap,
  normalizeProductAttributeLocaleMapForSave,
  resolveLocalizedString,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { type Collection, type CollectionLocaleMap } from "~/src/modules/product-collection/product-collection.types"

const AVG_DECIMALS = 10

export const coerceCollectionLocaleMap = (value: unknown): CollectionLocaleMap => {
  if (typeof value === "string") {
    return coerceProductAttributeLocaleMap({
      [DEFAULT_LOCALE]: value,
    })
  }
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyProductAttributeLocaleMap()
  }
  return coerceProductAttributeLocaleMap(value)
}

export const normalizeOptionalCollectionLocaleMapForSave = (map: CollectionLocaleMap): CollectionLocaleMap | undefined => {
  const normalized = normalizeProductAttributeLocaleMapForSave(map)
  if (LOCALES.every((locale) => normalized[locale] === "")) {
    return undefined
  }
  return normalized
}

export const resolveCollectionTitle = (titles: unknown, locale: string): string =>
  resolveLocalizedString(coerceCollectionLocaleMap(titles), locale)

export const resolveCollectionDescription = (descriptions: unknown, locale: string): string =>
  resolveLocalizedString(coerceCollectionLocaleMap(descriptions), locale)

export const toAdminCollectionListItem = (row: Collection["select"], productCount: number): Collection["adminListItem"] => ({
  ...row,
  productCount,
  titles: coerceCollectionLocaleMap(row.titles),
})

export const toCollectionRow = (input: Collection["createInput"], id: string, rank: number): Collection["insert"] => ({
  descriptions: normalizeOptionalCollectionLocaleMapForSave(input.descriptions),
  handle: input.handle,
  id,
  image: input.image === "" ? undefined : input.image,
  rank,
  status: input.status,
  titles: normalizeProductAttributeLocaleMapForSave(input.titles),
})

export const computeCollectionStats = (
  counts:
    | {
        active: number
        draft: number
        total: number
      }
    | undefined,
  productTotal: number,
): Collection["stats"] => {
  const total = counts?.total ?? 0
  const avgProducts = total === 0 ? 0 : Math.round((productTotal / total) * AVG_DECIMALS) / AVG_DECIMALS
  return {
    active: counts?.active ?? 0,
    avgProducts,
    draft: counts?.draft ?? 0,
    total,
  }
}
