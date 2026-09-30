import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  coerceProductAttributeLocaleMap,
  normalizeProductAttributeLocaleMapForSave,
  resolveLocalizedString,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

const AVG_DECIMALS = 10

export const coerceCollectionLocaleMap = (value: unknown): ProductCollection["localeMap"] => coerceProductAttributeLocaleMap(value)

export const normalizeOptionalCollectionLocaleMapForSave = (
  map: ProductCollection["localeMap"],
): ProductCollection["localeMap"] | undefined => {
  const normalized = normalizeProductAttributeLocaleMapForSave(map)
  if (I18N.SUPPORTED_LOCALES.every((locale) => normalized[locale] === "")) {
    return undefined
  }

  return normalized
}

export const resolveCollectionTitle = (titles: unknown, locale: string): string =>
  resolveLocalizedString(coerceCollectionLocaleMap(titles), locale)

export const resolveCollectionDescription = (descriptions: unknown, locale: string): string =>
  resolveLocalizedString(coerceCollectionLocaleMap(descriptions), locale)

export const resolveCollectionShortDescription = (shortDescriptions: unknown, locale: string): string =>
  resolveLocalizedString(coerceCollectionLocaleMap(shortDescriptions), locale)

export const toAdminCollectionListItem = (row: ProductCollection["select"], productCount: number): ProductCollection["adminListItem"] => ({
  ...row,
  productCount,
  titles: coerceCollectionLocaleMap(row.titles),
})

export const toCollectionRow = (input: ProductCollection["createInput"], id: string, rank: number): ProductCollection["insert"] => ({
  descriptions: normalizeOptionalCollectionLocaleMapForSave(input.descriptions),
  handle: input.handle,
  id,
  image: input.image === "" ? undefined : input.image,
  rank,
  shortDescriptions: normalizeOptionalCollectionLocaleMapForSave(input.shortDescriptions),
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
): ProductCollection["stats"] => {
  const total = counts?.total ?? 0
  const avgProducts = total === 0 ? 0 : Math.round((productTotal / total) * AVG_DECIMALS) / AVG_DECIMALS

  return {
    active: counts?.active ?? 0,
    avgProducts,
    draft: counts?.draft ?? 0,
    total,
  }
}
