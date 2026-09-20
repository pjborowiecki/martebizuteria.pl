import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getProductCountsQuery } from "~/src/modules/collection-on-product/collection-on-product.accessors"
import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getAdminCollectionsQuery } from "~/src/modules/product-collection/product-collection.server"
import { toAdminCollectionListItem } from "~/src/modules/product-collection/product-collection.utils"

export const fetchAdminCollectionsFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()
  const [collections, counts] = await Promise.all([getAdminCollectionsQuery.execute(), getProductCountsQuery.execute()])
  const countByCollectionId = new Map(counts.map((entry) => [entry.collectionId, entry.count]))
  return collections.map((row) => toAdminCollectionListItem(row, countByCollectionId.get(row.id) ?? 0))
})

export const adminCollectionsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchAdminCollectionsFn(),
    queryKey: COLLECTION_QUERY_KEYS.ADMIN.ALL,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
