import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getStorefrontCollectionsQuery } from "~/src/modules/product-collection/product-collection.server"

export const getCollections = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .handler(() => getStorefrontCollectionsQuery.execute())

export const getCollectionsQuery = () =>
  queryOptions({
    queryFn: () => getCollections(),
    queryKey: COLLECTION_QUERY_KEYS.ALL,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
