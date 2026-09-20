import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { getStorefrontCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"
import { getPublishedProductsByCollectionId } from "~/src/modules/product/product.accessors"
import {
  LANDING_NEW_ARRIVALS_COLLECTION_HANDLE,
  LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
  PRODUCT_QUERY_KEYS,
  PRODUCT_QUERY_STALE_MS,
} from "~/src/modules/product/product.constants"

export const fetchLandingNewArrivalsProductsFn = createServerFn({ method: "GET" }).handler(async () => {
  const collection = await getStorefrontCollectionByHandleQuery.execute({
    handle: LANDING_NEW_ARRIVALS_COLLECTION_HANDLE,
  })

  if (collection === undefined) {
    return []
  }

  const { items } = await getPublishedProductsByCollectionId(collection.id, {
    limit: LANDING_NEW_ARRIVALS_PRODUCT_LIMIT,
    offset: 0,
  })

  return items
})

export const landingNewArrivalsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchLandingNewArrivalsProductsFn(),
    queryKey: PRODUCT_QUERY_KEYS.LANDING_NEW_ARRIVALS,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
