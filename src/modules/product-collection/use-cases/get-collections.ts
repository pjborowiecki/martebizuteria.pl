import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { getStorefrontCollectionsQuery } from "~/src/modules/product-collection/product-collection.accessors"
import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"

import { readThroughStorefrontCache } from "~/src/lib/storefront-read"

export const getCollections = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(() => readThroughStorefrontCache(() => getStorefrontCollectionsQuery.execute()))

export const getCollectionsQuery = () =>
  queryOptions({
    queryFn: () => getCollections(),
    queryKey: COLLECTION_QUERY_KEYS.ALL,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
