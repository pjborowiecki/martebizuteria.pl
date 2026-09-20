import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getCollectionProductTotalQuery } from "~/src/modules/collection-on-product/collection-on-product.accessors"
import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getCollectionStatusCountsQuery } from "~/src/modules/product-collection/product-collection.server"
import { computeCollectionStats } from "~/src/modules/product-collection/product-collection.utils"

export const fetchCollectionStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()
  const [[counts], [products]] = await Promise.all([getCollectionStatusCountsQuery.execute(), getCollectionProductTotalQuery.execute()])
  return computeCollectionStats(counts, products?.value ?? 0)
})

export const collectionStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCollectionStatsFn(),
    queryKey: COLLECTION_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
