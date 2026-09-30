import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
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
import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

const storefrontSearchInputSchema = zod.object({
  locale: zod.string().min(STOREFRONT_SEARCH_LOCALE_MIN_LENGTH).default(I18N.DEFAULT_LOCALE),
  query: zod.string().trim().min(STOREFRONT_SEARCH_MIN_LENGTH),
})

export const searchStorefront = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof storefrontSearchInputSchema>) => storefrontSearchInputSchema.parse(input))
  .handler(async ({ data: { query, locale } }): Promise<StorefrontSearch["results"]> => {
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

export const searchStorefrontQuery = (query: string, locale: string = I18N.DEFAULT_LOCALE) =>
  queryOptions({
    enabled: query.trim().length >= STOREFRONT_SEARCH_MIN_LENGTH,
    queryFn: () => searchStorefront({ data: { locale, query } }),
    queryKey: [...STOREFRONT_SEARCH_QUERY_KEYS.RESULTS, locale, query],
    staleTime: STOREFRONT_SEARCH_QUERY_STALE_MS,
  })
