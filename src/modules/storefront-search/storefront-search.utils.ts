import { STOREFRONT_PRODUCTS_SORT, STOREFRONT_PRODUCTS_SORTS } from "~/src/modules/storefront-search/storefront-search.constants"
import { type StorefrontCatalogScope, type StorefrontProductsSearch } from "~/src/modules/storefront-search/storefront-search.zod"

const TOKEN_SEPARATOR = /[^\p{L}\p{N}]+/u

export const foldStorefrontSearchText = (text: string): string => text.replaceAll("ł", "l").replaceAll("Ł", "L")

export const buildStorefrontSearchExpression = (term: string): string | undefined => {
  const tokens = foldStorefrontSearchText(term)
    .split(TOKEN_SEPARATOR)
    .filter((token) => token !== "")
  if (tokens.length === 0) {
    return undefined
  }

  return tokens.map((token) => `"${token}"*`).join(" ")
}

export const hasActiveStorefrontProductFilters = (
  search: StorefrontProductsSearch,
  options?: {
    readonly ignoreCategory?: boolean
    readonly ignoreCollection?: boolean
  },
): boolean => countActiveStorefrontProductFilters(search, options) > 0

export const countActiveStorefrontProductFilters = (
  search: StorefrontProductsSearch,
  options?: {
    readonly ignoreCategory?: boolean
    readonly ignoreCollection?: boolean
  },
): number => {
  let count = 0
  if (options?.ignoreCategory !== true && search.category !== undefined) {
    count++
  }

  if (options?.ignoreCollection !== true && search.collection !== undefined) {
    count++
  }

  if (search.minPrice !== undefined) {
    count++
  }

  if (search.maxPrice !== undefined) {
    count++
  }

  if (search.q !== undefined) {
    count++
  }

  if (search.sort !== undefined && search.sort !== STOREFRONT_PRODUCTS_SORT.RANK) {
    count++
  }

  return count
}

export const buildEffectiveStorefrontProductsSearch = (
  search: StorefrontProductsSearch,
  scope?: StorefrontCatalogScope,
): StorefrontProductsSearch =>
  normalizeStorefrontProductsSearch({
    ...search,
    ...(scope?.categoryHandle === undefined
      ? {}
      : {
          category: scope.categoryHandle,
        }),
    ...(scope?.collectionHandle === undefined
      ? {}
      : {
          collection: scope.collectionHandle,
        }),
  })

export const storefrontCatalogFilterOptions = (
  scope?: StorefrontCatalogScope,
): {
  readonly ignoreCategory: boolean
  readonly ignoreCollection: boolean
} => ({
  ignoreCategory: scope?.categoryHandle !== undefined,
  ignoreCollection: scope?.collectionHandle !== undefined,
})

export const normalizeStorefrontProductsSearch = (search: StorefrontProductsSearch): StorefrontProductsSearch => {
  const normalized: StorefrontProductsSearch = {}
  if (search.category !== undefined) {
    normalized.category = search.category
  }

  if (search.collection !== undefined) {
    normalized.collection = search.collection
  }

  if (search.minPrice !== undefined) {
    normalized.minPrice = search.minPrice
  }

  if (search.maxPrice !== undefined) {
    normalized.maxPrice = search.maxPrice
  }

  if (search.q !== undefined) {
    normalized.q = search.q
  }

  if (search.sort !== undefined) {
    normalized.sort = search.sort
  }

  return normalized
}

const applyStorefrontScopeSearchPatch = (next: StorefrontProductsSearch, patch: Partial<StorefrontProductsSearch>): void => {
  if ("category" in patch) {
    if (patch.category === undefined) {
      delete next.category
    } else {
      next.category = patch.category
    }
  }

  if ("collection" in patch) {
    if (patch.collection === undefined) {
      delete next.collection
    } else {
      next.collection = patch.collection
    }
  }
}

const applyStorefrontRangeSearchPatch = (next: StorefrontProductsSearch, patch: Partial<StorefrontProductsSearch>): void => {
  if ("minPrice" in patch) {
    if (patch.minPrice === undefined) {
      delete next.minPrice
    } else {
      next.minPrice = patch.minPrice
    }
  }

  if ("maxPrice" in patch) {
    if (patch.maxPrice === undefined) {
      delete next.maxPrice
    } else {
      next.maxPrice = patch.maxPrice
    }
  }

  if ("q" in patch) {
    if (patch.q === undefined) {
      delete next.q
    } else {
      next.q = patch.q
    }
  }

  if ("sort" in patch) {
    if (patch.sort === undefined) {
      delete next.sort
    } else {
      next.sort = patch.sort
    }
  }
}

export const applyStorefrontProductsSearchPatch = (
  current: StorefrontProductsSearch,
  patch: Partial<StorefrontProductsSearch>,
  options?: {
    readonly clearAll?: boolean
  },
): StorefrontProductsSearch => {
  if (options?.clearAll === true) {
    return {}
  }

  const next: StorefrontProductsSearch = {
    ...current,
  }
  applyStorefrontScopeSearchPatch(next, patch)
  applyStorefrontRangeSearchPatch(next, patch)

  return normalizeStorefrontProductsSearch(next)
}

export const isStorefrontProductsSort = (value: string): value is NonNullable<StorefrontProductsSearch["sort"]> =>
  (STOREFRONT_PRODUCTS_SORTS as readonly string[]).includes(value)
