import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import {
  STOREFRONT_SEARCH_LOCALE_MIN_LENGTH,
  STOREFRONT_SEARCH_MIN_LENGTH,
  STOREFRONT_SEARCH_QUERY_STALE_MS
} from "~/src/modules/storefront-search/storefront-search.constants";
import { getStorefrontSearchTrending, searchStorefrontCatalog } from "~/src/modules/storefront-search/storefront-search.server";

const storefrontSearchInputSchema = z.object({
  locale: z.string().min(STOREFRONT_SEARCH_LOCALE_MIN_LENGTH).default(DEFAULT_LOCALE),
  query: z.string().trim().min(STOREFRONT_SEARCH_MIN_LENGTH)
});

const storefrontSearchTrendingInputSchema = z.object({
  locale: z.string().min(STOREFRONT_SEARCH_LOCALE_MIN_LENGTH).default(DEFAULT_LOCALE)
});

const fetchStorefrontSearchFn = createServerFn({ method: "GET" })
  .inputValidator((input: z.infer<typeof storefrontSearchInputSchema>) => storefrontSearchInputSchema.parse(input))
  .handler(({ data }) => searchStorefrontCatalog(data.query, data.locale));

const fetchStorefrontSearchTrendingFn = createServerFn({ method: "GET" })
  .inputValidator((input: z.infer<typeof storefrontSearchTrendingInputSchema>) => storefrontSearchTrendingInputSchema.parse(input))
  .handler(({ data }) => getStorefrontSearchTrending(data.locale));

export const storefrontSearchQueries = {
  fetchStorefrontSearchFn,
  fetchStorefrontSearchTrendingFn
};

export const storefrontSearchQueryOptions = {
  resultsQueryOptions: (query: string, locale: string = DEFAULT_LOCALE) =>
    queryOptions({
      enabled: query.trim().length >= STOREFRONT_SEARCH_MIN_LENGTH,
      queryFn: () => fetchStorefrontSearchFn({ data: { locale, query } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.STOREFRONT_SEARCH.RESULTS, locale, query] as const,
      staleTime: STOREFRONT_SEARCH_QUERY_STALE_MS
    }),
  trendingQueryOptions: (locale: string = DEFAULT_LOCALE) =>
    queryOptions({
      queryFn: () => fetchStorefrontSearchTrendingFn({ data: { locale } }),
      queryKey: [...CONSTANTS.QUERY_KEYS.STOREFRONT_SEARCH.TRENDING, locale] as const,
      staleTime: STOREFRONT_SEARCH_QUERY_STALE_MS
    })
};
