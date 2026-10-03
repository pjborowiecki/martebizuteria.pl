import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  STOREFRONT_SEARCH_LIMIT_PER_GROUP,
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

interface StorefrontSearchInput {
  readonly locale?: string
  readonly query: string
}

const storefrontSearchInputSchema = zod.object({
  locale: zod.enum(I18N.SUPPORTED_LOCALES).default(I18N.DEFAULT_LOCALE),
  query: zod.string().trim().min(STOREFRONT_SEARCH_MIN_LENGTH),
})

export const searchStorefront = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: StorefrontSearchInput) => storefrontSearchInputSchema.parse(input))
  .handler(async ({ data: { query, locale } }): Promise<StorefrontSearch["results"]> => {
    const limit = STOREFRONT_SEARCH_LIMIT_PER_GROUP

    const [products, categories, collections] = await Promise.all([
      searchStorefrontProducts(query, locale, limit),
      searchStorefrontCategories(query, locale, limit),
      searchStorefrontCollections(query, locale, limit),
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
