import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, desc, eq } from "drizzle-orm"
import zod from "zod/v4"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import {
  STOREFRONT_SEARCH_QUERY_KEYS,
  STOREFRONT_SEARCH_QUERY_STALE_MS,
  STOREFRONT_SEARCH_TRENDING_LIMIT,
  STOREFRONT_SEARCH_TRENDING_SOURCE_COUNT,
} from "~/src/modules/storefront-search/storefront-search.constants"
import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import { getProductImageUrl } from "~/src/lib/image"

interface StorefrontSearchTrendingInput {
  readonly locale?: string
}

const storefrontSearchTrendingInputSchema = zod.object({
  locale: zod.enum(I18N.SUPPORTED_LOCALES).default(I18N.DEFAULT_LOCALE),
})

export const getTrendingSearches = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: StorefrontSearchTrendingInput) => storefrontSearchTrendingInputSchema.parse(input))
  .handler(async ({ data: { locale } }): Promise<readonly StorefrontSearch["trendingItem"][]> => {
    const perSourceLimit = Math.ceil(STOREFRONT_SEARCH_TRENDING_LIMIT / STOREFRONT_SEARCH_TRENDING_SOURCE_COUNT)

    const [categories, collections] = await Promise.all([
      db
        .select({
          handle: productCategory.handle,
          image: productCategory.image,
          titles: productCategory.titles,
        })
        .from(productCategory)
        .where(eq(productCategory.status, CATEGORY_STATUS.ACTIVE))
        .orderBy(asc(productCategory.rank), desc(productCategory.createdAt))
        .limit(perSourceLimit),
      db
        .select({
          handle: productCollection.handle,
          image: productCollection.image,
          titles: productCollection.titles,
        })
        .from(productCollection)
        .where(eq(productCollection.status, COLLECTION_STATUS.ACTIVE))
        .orderBy(asc(productCollection.rank), desc(productCollection.createdAt))
        .limit(perSourceLimit),
    ])

    const items: StorefrontSearch["trendingItem"][] = []

    for (const row of categories) {
      const label = resolveCategoryTitle(row.titles, locale).trim()
      if (label !== "") {
        items.push({
          handle: row.handle,
          image: getProductImageUrl(row.image),
          label,
          type: "category",
        })
      }
    }

    for (const row of collections) {
      const label = resolveCollectionTitle(row.titles, locale).trim()
      if (label !== "") {
        items.push({
          handle: row.handle,
          image: getProductImageUrl(row.image),
          label,
          type: "collection",
        })
      }
    }

    return items.slice(0, STOREFRONT_SEARCH_TRENDING_LIMIT)
  })

export const getTrendingSearchesQuery = (locale: string = I18N.DEFAULT_LOCALE) =>
  queryOptions({
    queryFn: () => getTrendingSearches({ data: { locale } }),
    queryKey: [...STOREFRONT_SEARCH_QUERY_KEYS.TRENDING, locale],
    staleTime: STOREFRONT_SEARCH_QUERY_STALE_MS,
  })
