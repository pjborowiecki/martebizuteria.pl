import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getCollectionProductTotalQuery } from "~/src/modules/collection-on-product/collection-on-product.accessors"
import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getCollectionStatusCountsQuery } from "~/src/modules/product-collection/product-collection.server"
import { computeCollectionStats } from "~/src/modules/product-collection/product-collection.utils"

export const getCollectionStats = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .handler(async () => {
    const [[counts], [products]] = await Promise.all([getCollectionStatusCountsQuery.execute(), getCollectionProductTotalQuery.execute()])

    return computeCollectionStats(counts, products?.value ?? 0)
  })

export const getCollectionStatsQuery = () =>
  queryOptions({
    queryFn: () => getCollectionStats(),
    queryKey: COLLECTION_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
