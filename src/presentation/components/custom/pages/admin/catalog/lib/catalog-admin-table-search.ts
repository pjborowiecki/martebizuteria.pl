import { LOCALES } from "~/src/integrations/use-intl/i18n.config"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import {
  coerceProductAttributeLocaleMap,
  createEmptyProductAttributeLocaleMap,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { type Category } from "~/src/modules/product-category/product-category.types"
import { type Collection } from "~/src/modules/product-collection/product-collection.types"
import { type Product } from "~/src/modules/product/product.types"
import { coerceProductTagsLocaleMap } from "~/src/modules/product/product.utils"

import { appendSearchPart } from "~/src/presentation/components/custom/datagrid/lib/catalog-table-global-filter"
const appendCatalogLocaleMapSearchParts = (parts: string[], map: unknown): void => {
  const coerced =
    map === null || map === undefined || typeof map !== "object" || Array.isArray(map)
      ? createEmptyProductAttributeLocaleMap()
      : coerceProductAttributeLocaleMap(map)
  for (const locale of LOCALES) {
    appendSearchPart(parts, coerced[locale])
  }
}
const appendDateSearchPart = (parts: string[], value: Date | string | number | null | undefined): void => {
  if (value === null || value === undefined || value === "") {
    return
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return
  }
  appendSearchPart(parts, date.toISOString())
  appendSearchPart(parts, date.toLocaleDateString())
}
const appendProductTagsLocaleMapSearchParts = (parts: string[], tags: unknown): void => {
  const coerced = coerceProductTagsLocaleMap(tags)
  for (const locale of LOCALES) {
    for (const tag of coerced[locale]) {
      appendSearchPart(parts, tag)
    }
  }
}
export const getCategoryAdminSearchParts = (row: Category["adminListItem"], statusLabel: string): string[] => {
  const parts: string[] = []
  appendCatalogLocaleMapSearchParts(parts, row.titles)
  appendSearchPart(parts, row.handle)
  appendSearchPart(parts, row.id)
  appendSearchPart(parts, row.status)
  appendSearchPart(parts, statusLabel)
  appendCatalogLocaleMapSearchParts(parts, row.parentTitles)
  appendCatalogLocaleMapSearchParts(parts, row.subtitles)
  appendCatalogLocaleMapSearchParts(parts, row.shortDescriptions)
  appendCatalogLocaleMapSearchParts(parts, row.descriptions)
  appendSearchPart(parts, row.productCount)
  appendDateSearchPart(parts, row.createdAt)
  appendDateSearchPart(parts, row.updatedAt)
  return parts
}
export const getCollectionAdminSearchParts = (row: Collection["adminListItem"], statusLabel: string): string[] => {
  const parts: string[] = []
  appendCatalogLocaleMapSearchParts(parts, row.titles)
  appendSearchPart(parts, row.handle)
  appendSearchPart(parts, row.id)
  appendSearchPart(parts, row.status)
  appendSearchPart(parts, statusLabel)
  appendCatalogLocaleMapSearchParts(parts, row.descriptions)
  appendSearchPart(parts, row.productCount)
  appendDateSearchPart(parts, row.createdAt)
  appendDateSearchPart(parts, row.updatedAt)
  return parts
}
export const getAttributeAdminSearchParts = (
  row: ProductAttribute["adminListItem"],
  typeLabel: string,
  allowedValuesDisplay: string,
): string[] => {
  const parts: string[] = []
  appendSearchPart(parts, row.titles.pl)
  appendSearchPart(parts, row.titles.en)
  appendSearchPart(parts, row.handle)
  appendSearchPart(parts, row.id)
  appendSearchPart(parts, row.type)
  appendSearchPart(parts, typeLabel)
  appendSearchPart(parts, allowedValuesDisplay)
  appendSearchPart(parts, row.unit)
  appendSearchPart(parts, row.productCount)
  appendDateSearchPart(parts, row.createdAt)
  appendDateSearchPart(parts, row.updatedAt)
  return parts
}
export const getProductAdminSearchParts = (row: Product["adminListItem"], statusLabel: string): string[] => {
  const parts: string[] = []
  appendCatalogLocaleMapSearchParts(parts, row.titles)
  appendSearchPart(parts, row.handle)
  appendSearchPart(parts, row.id)
  appendSearchPart(parts, row.status)
  appendSearchPart(parts, statusLabel)
  appendSearchPart(parts, row.categoryTitles)
  appendSearchPart(parts, row.collectionTitles)
  appendSearchPart(parts, row.attributeTitles)
  appendCatalogLocaleMapSearchParts(parts, row.subtitles)
  appendCatalogLocaleMapSearchParts(parts, row.descriptions)
  appendProductTagsLocaleMapSearchParts(parts, row.tags)
  appendSearchPart(parts, row.totalStock)
  appendSearchPart(parts, row.variantCount)
  appendSearchPart(parts, row.minPrice)
  appendDateSearchPart(parts, row.createdAt)
  appendDateSearchPart(parts, row.updatedAt)
  return parts
}
