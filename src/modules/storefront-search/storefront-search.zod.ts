import { z } from "zod/v4"

import { STOREFRONT_PRODUCTS_SORTS, STOREFRONT_SEARCH_MAX_LENGTH } from "~/src/modules/storefront-search/storefront-search.constants"

export const storefrontProductsSearchSchema = z.object({
  category: z.string().trim().nonempty().optional(),
  collection: z.string().trim().nonempty().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  q: z
    .string()
    .trim()
    .nonempty()
    .overwrite((term) => term.slice(0, STOREFRONT_SEARCH_MAX_LENGTH).trimEnd())
    .optional(),
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

export const storefrontCatalogScopeSchema = z.object({
  categoryHandle: storefrontProductsSearchSchema.shape.category,
  collectionHandle: storefrontProductsSearchSchema.shape.collection,
})

export type StorefrontCatalogScope = z.infer<typeof storefrontCatalogScopeSchema>
