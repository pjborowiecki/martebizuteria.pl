import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"

import {
  STOREFRONT_SEARCH_LIMIT_PER_GROUP,
  STOREFRONT_SEARCH_LOCALE_MIN_LENGTH,
  STOREFRONT_SEARCH_MIN_LENGTH,
  STOREFRONT_SEARCH_QUERY_KEYS,
  STOREFRONT_SEARCH_QUERY_STALE_MS,
} from "~/src/modules/storefront-search/storefront-search.constants"
import {
  searchStorefrontCategories,
  searchStorefrontCollections,
  searchStorefrontProducts,
} from "~/src/modules/storefront-search/storefront-search.server"
import { type StorefrontSearchResults } from "~/src/modules/storefront-search/storefront-search.types"

import { normalizeAdminSearchTerm } from "~/src/lib/admin-search.server"

const storefrontSearchInputSchema = z.object({
  locale: z.string().min(STOREFRONT_SEARCH_LOCALE_MIN_LENGTH).default(DEFAULT_LOCALE),
  query: z.string().trim().min(STOREFRONT_SEARCH_MIN_LENGTH),
})

export const fetchStorefrontSearchFn = createServerFn({ method: "GET" })
  .validator((input: z.infer<typeof storefrontSearchInputSchema>) => storefrontSearchInputSchema.parse(input))
  .handler(async ({ data: { query, locale } }): Promise<StorefrontSearchResults> => {
    const limit = STOREFRONT_SEARCH_LIMIT_PER_GROUP
    const term = normalizeAdminSearchTerm(query)
    if (term === undefined) {
      return { categories: [], collections: [], products: [] }
    }

    const [products, categories, collections] = await Promise.all([
      searchStorefrontProducts(term, locale, limit),
      searchStorefrontCategories(term, locale, limit),
      searchStorefrontCollections(term, locale, limit),
    ])

    return { categories, collections, products }
  })

export const resultsQueryOptions = (query: string, locale: string = DEFAULT_LOCALE) =>
  queryOptions({
    enabled: query.trim().length >= STOREFRONT_SEARCH_MIN_LENGTH,
    queryFn: () => fetchStorefrontSearchFn({ data: { locale, query } }),
    queryKey: [...STOREFRONT_SEARCH_QUERY_KEYS.RESULTS, locale, query] as const,
    staleTime: STOREFRONT_SEARCH_QUERY_STALE_MS,
  })
