import { z } from "zod/v4"

export const STOREFRONT_PRODUCTS_SORT = {
  NEWEST: "newest",
  PRICE_ASC: "price_asc",
  PRICE_DESC: "price_desc",
  RANK: "rank",
} as const

export const STOREFRONT_PRODUCTS_SORTS = [
  STOREFRONT_PRODUCTS_SORT.RANK,
  STOREFRONT_PRODUCTS_SORT.NEWEST,
  STOREFRONT_PRODUCTS_SORT.PRICE_ASC,
  STOREFRONT_PRODUCTS_SORT.PRICE_DESC,
] as const

export type StorefrontProductsSort = (typeof STOREFRONT_PRODUCTS_SORTS)[number]

export const storefrontProductsSearchSchema = z.object({
  category: z.string().trim().nonempty().optional(),
  collection: z.string().trim().nonempty().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  q: z.string().trim().nonempty().optional(),
  sort: z.enum(STOREFRONT_PRODUCTS_SORTS).optional(),
})

export type StorefrontProductsSearch = z.infer<typeof storefrontProductsSearchSchema>

export const storefrontScopedCollectionCatalogSearchSchema = storefrontProductsSearchSchema.omit({
  collection: true,
})

export type StorefrontScopedCollectionCatalogSearch = z.infer<typeof storefrontScopedCollectionCatalogSearchSchema>

export const storefrontScopedCategoryCatalogSearchSchema = storefrontProductsSearchSchema.omit({
  category: true,
})

export type StorefrontScopedCategoryCatalogSearch = z.infer<typeof storefrontScopedCategoryCatalogSearchSchema>

export interface StorefrontCatalogScope {
  readonly categoryHandle?: string
  readonly collectionHandle?: string
}

export interface StorefrontProductsPageInput extends StorefrontProductsSearch {
  readonly page?: number
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
