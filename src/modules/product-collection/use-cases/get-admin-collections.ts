import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getProductCountsQuery } from "~/src/modules/collection-on-product/collection-on-product.accessors"
import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getAdminCollectionsQuery as productCollectionGetAdminCollectionsQuery } from "~/src/modules/product-collection/product-collection.server"
import { toAdminCollectionListItem } from "~/src/modules/product-collection/product-collection.utils"

export const getAdminCollections = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .handler(async () => {
    const [collections, counts] = await Promise.all([productCollectionGetAdminCollectionsQuery.execute(), getProductCountsQuery.execute()])
    const countByCollectionId = new Map(counts.map((entry) => [entry.collectionId, entry.count]))

    return collections.map((row) => toAdminCollectionListItem(row, countByCollectionId.get(row.id) ?? 0))
  })

export const getAdminCollectionsQuery = () =>
  queryOptions({
    queryFn: () => getAdminCollections(),
    queryKey: COLLECTION_QUERY_KEYS.ADMIN.ALL,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
