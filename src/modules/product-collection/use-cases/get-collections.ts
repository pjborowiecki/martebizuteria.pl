import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getStorefrontCollectionsQuery } from "~/src/modules/product-collection/product-collection.server"

export const fetchCollectionsFn = createServerFn({ method: "GET" }).handler(() => getStorefrontCollectionsQuery.execute())

export const collectionsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCollectionsFn(),
    queryKey: COLLECTION_QUERY_KEYS.ALL,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
