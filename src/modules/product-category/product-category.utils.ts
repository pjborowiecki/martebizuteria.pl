import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  coerceProductAttributeLocaleMap,
  normalizeProductAttributeLocaleMapForSave,
  resolveLocalizedString,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

const AVG_DECIMALS = 10

type CategoryWithChildren = ProductCategory["select"] & {
  children?: ProductCategory["select"][]
}

export const coerceCategoryLocaleMap = (value: unknown): ProductCategory["localeMap"] => coerceProductAttributeLocaleMap(value)

export const normalizeOptionalCategoryLocaleMapForSave = (map: ProductCategory["localeMap"]): ProductCategory["localeMap"] | undefined => {
  const normalized = normalizeProductAttributeLocaleMapForSave(map)
  if (I18N.SUPPORTED_LOCALES.every((locale) => normalized[locale] === "")) {
    return undefined
  }

  return normalized
}

export const resolveCategoryTitle = (titles: unknown, locale: string): string =>
  resolveLocalizedString(coerceCategoryLocaleMap(titles), locale)

export const resolveCategorySubtitle = (subtitles: unknown, locale: string): string =>
  resolveLocalizedString(coerceCategoryLocaleMap(subtitles), locale)

export const resolveCategoryShortDescription = (shortDescriptions: unknown, locale: string): string =>
  resolveLocalizedString(coerceCategoryLocaleMap(shortDescriptions), locale)

export const resolveCategoryDescription = (descriptions: unknown, locale: string): string =>
  resolveLocalizedString(coerceCategoryLocaleMap(descriptions), locale)

export const withActiveSortedChildren = (root: CategoryWithChildren): ProductCategory["select"] => {
  const activeChildren = (root.children ?? [])
    .filter((child) => child.status === CATEGORY_STATUS.ACTIVE)
    .toSorted((left, right) => left.rank - right.rank)
  return {
    ...root,
    children: activeChildren,
  } as ProductCategory["select"]
}

export const toAdminCategoryListItem = (
  row: ProductCategory["select"],
  productCount: number,
  titlesById: Map<string, ProductCategory["localeMap"]>,
): ProductCategory["adminListItem"] => {
  const parentId = normalizeCategoryParentId(row.parentId)
  const parentTitles = parentId === undefined ? undefined : titlesById.get(parentId)

  return {
    ...row,
    parentTitles: parentTitles === undefined ? undefined : coerceCategoryLocaleMap(parentTitles),
    productCount,
    titles: coerceCategoryLocaleMap(row.titles),
  }
}

export const normalizeCategoryParentId = (parentId: string | null | undefined): string | undefined => {
  if (parentId === null || parentId === "") {
    return undefined
  }

  return parentId
}

export const wouldCreateCategoryParentCycle = (
  categoryId: string,
  newParentId: string,
  categoriesById: ReadonlyMap<string, Pick<ProductCategory["select"], "id" | "parentId">>,
): boolean => {
  let current: string | undefined = newParentId
  while (current !== undefined) {
    if (current === categoryId) {
      return true
    }
    current = normalizeCategoryParentId(categoriesById.get(current)?.parentId)
  }

  return false
}

export const buildCategoryRankUpdates = (
  orderedIds: readonly string[],
  categoriesById: ReadonlyMap<string, Pick<ProductCategory["select"], "id" | "parentId">>,
): {
  id: string
  rank: number
}[] => {
  const groups = new Map<string | undefined, string[]>()
  for (const id of orderedIds) {
    const row = categoriesById.get(id)
    if (row !== undefined) {
      const parentKey = normalizeCategoryParentId(row.parentId)
      const group = groups.get(parentKey)
      if (group === undefined) {
        groups.set(parentKey, [id])
      } else {
        group.push(id)
      }
    }
  }

  const updates: {
    id: string
    rank: number
  }[] = []

  for (const ids of groups.values()) {
    ids.forEach((id, index) => {
      updates.push({
        id,
        rank: index,
      })
    })
  }

  return updates
}

export const toCategoryRow = (input: ProductCategory["createInput"], id: string, rank: number): ProductCategory["insert"] => ({
  descriptions: normalizeOptionalCategoryLocaleMapForSave(input.descriptions),
  handle: input.handle,
  id,
  image: input.image === "" ? undefined : input.image,
  parentId: input.parentId === "" ? undefined : input.parentId,
  rank,
  shortDescriptions: normalizeOptionalCategoryLocaleMapForSave(input.shortDescriptions),
  status: input.status,
  subtitles: normalizeOptionalCategoryLocaleMapForSave(input.subtitles),
  titles: normalizeProductAttributeLocaleMapForSave(input.titles),
})

export const normalizeCategoryParentIdForMutation = (parentId: string | undefined): string | undefined =>
  parentId === undefined || parentId === "" ? undefined : parentId

export const collectDescendantCategoryIds = (
  rootId: string,
  categories: readonly Pick<ProductCategory["select"], "id" | "parentId">[],
): string[] => {
  const childrenByParent = new Map<string, string[]>()
  for (const row of categories) {
    if (row.parentId !== null && row.parentId !== "") {
      const siblings = childrenByParent.get(row.parentId)
      if (siblings === undefined) {
        childrenByParent.set(row.parentId, [row.id])
      } else {
        siblings.push(row.id)
      }
    }
  }

  const ids: string[] = []
  const stack = [rootId]
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    ids.push(current)
    const children = childrenByParent.get(current)
    if (children !== undefined) {
      stack.push(...children)
    }
  }

  return ids
}

export const computeCategoryStats = (
  counts:
    | {
        active: number
        draft: number
        total: number
      }
    | undefined,
  productTotal: number,
): ProductCategory["stats"] => {
  const total = counts?.total ?? 0
  const avgProducts = total === 0 ? 0 : Math.round((productTotal / total) * AVG_DECIMALS) / AVG_DECIMALS

  return {
    active: counts?.active ?? 0,
    avgProducts,
    draft: counts?.draft ?? 0,
    total,
  }
}
