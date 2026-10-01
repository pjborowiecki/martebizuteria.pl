import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { getWishlistRows } from "~/src/modules/wishlist/wishlist.accessors"
import { WISHLIST_QUERY_KEYS, WISHLIST_QUERY_STALE_MS } from "~/src/modules/wishlist/wishlist.constants"
import { type Wishlist } from "~/src/modules/wishlist/wishlist.types"
import { toWishlistProduct } from "~/src/modules/wishlist/wishlist.utils"

export const listWishlistItems = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: { readonly locale?: string | undefined } | undefined) => ({ locale: input?.locale ?? I18N.DEFAULT_LOCALE }))
  .handler(async ({ context, data }): Promise<Wishlist["product"][]> => {
    const rows = await getWishlistRows(context.auth.user.id)

    return rows.map((row) => toWishlistProduct(row, data.locale))
  })

export const listWishlistItemsQuery = (locale: string) =>
  queryOptions({
    queryFn: () => listWishlistItems({ data: { locale } }),
    queryKey: [...WISHLIST_QUERY_KEYS.ITEMS, locale],
    staleTime: WISHLIST_QUERY_STALE_MS,
  })
