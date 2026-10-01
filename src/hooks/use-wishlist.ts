import { useCallback, useMemo } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { listWishlistProductIdsQuery } from "~/src/modules/wishlist/use-cases/list-wishlist-product-ids"
import { toggleWishlistItemMutation } from "~/src/modules/wishlist/use-cases/toggle-wishlist-item"
import { WISHLIST_ERROR_CODES, WISHLIST_MAX_ITEMS, WISHLIST_QUERY_KEYS } from "~/src/modules/wishlist/wishlist.constants"

import { ROUTES } from "~/src/routes"

export const useWishlist = (): UseWishlistResult => {
  const t = useTranslations("components.custom.productCard")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useQuery(getCurrentSessionQuery)
  const signedIn = session?.user !== undefined
  const { data: productIds = [] } = useQuery({ ...listWishlistProductIdsQuery(), enabled: signedIn })
  const toggleItem = useMutation(toggleWishlistItemMutation)
  const wishlistedIds = useMemo(() => new Set(productIds), [productIds])

  const isWishlisted = useCallback((productId: string) => wishlistedIds.has(productId), [wishlistedIds])

  const toggle = useCallback(
    (productId: string) => {
      if (!signedIn) {
        toast.info(t("wishlistSignInTitle"), {
          action: {
            label: t("wishlistSignInAction"),
            onClick: () => {
              void navigate({ to: ROUTES.AUTH_SIGN_IN })
            },
          },
          description: t("wishlistSignInDescription"),
        })

        return
      }

      toggleItem.mutate(
        { productId },
        {
          onError: (error) => {
            toast.error(error.message === WISHLIST_ERROR_CODES.FULL ? t("wishlistFull", { limit: WISHLIST_MAX_ITEMS }) : t("wishlistError"))
          },
          onSuccess: ({ wishlisted }) => {
            toast.success(wishlisted ? t("wishlistAdded") : t("wishlistRemoved"))
            void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEYS.ROOT })
          },
        },
      )
    },
    [navigate, queryClient, signedIn, t, toggleItem],
  )

  return { isWishlisted, signedIn, toggle }
}

interface UseWishlistResult {
  readonly isWishlisted: (productId: string) => boolean
  readonly signedIn: boolean
  readonly toggle: (productId: string) => void
}
