import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getWishlistProductIds } from "~/src/modules/wishlist/wishlist.accessors"
import { WISHLIST_QUERY_KEYS, WISHLIST_QUERY_STALE_MS } from "~/src/modules/wishlist/wishlist.constants"

export const listWishlistProductIds = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(({ context }): Promise<string[]> => getWishlistProductIds(context.auth.user.id))

export const listWishlistProductIdsQuery = () =>
  queryOptions({
    queryFn: () => listWishlistProductIds(),
    queryKey: WISHLIST_QUERY_KEYS.PRODUCT_IDS,
    staleTime: WISHLIST_QUERY_STALE_MS,
  })
