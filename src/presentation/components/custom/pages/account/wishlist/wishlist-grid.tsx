import { type JSX, useCallback } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Heart, ShoppingBag, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { useCartStore } from "~/src/modules/cart/cart.store"
import { toggleWishlistItemMutation } from "~/src/modules/wishlist/use-cases/toggle-wishlist-item"
import { WISHLIST_QUERY_KEYS } from "~/src/modules/wishlist/wishlist.constants"
import { type Wishlist } from "~/src/modules/wishlist/wishlist.types"

import { Button } from "~/src/presentation/components/shadcn/button"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const WishlistGrid = ({ items }: Readonly<WishlistGridProps>): JSX.Element => {
  const t = useTranslations("pages.account.wishlist")

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Heart className="size-8 text-muted-foreground/30" strokeWidth={1} />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
        <LocalizedLink
          className="mt-2 inline-flex h-10 items-center justify-center bg-foreground px-8 text-[11px] tracking-[0.15em] text-background uppercase transition-colors hover:bg-foreground/90"
          to={ROUTES.PRODUCTS}
        >
          {t("browseProducts")}
        </LocalizedLink>
      </div>
    )
  }

  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <WishlistCard item={item} key={item.productId} />
      ))}
    </ul>
  )
}

const WishlistCard = ({ item }: Readonly<{ item: Wishlist["product"] }>): JSX.Element => {
  const t = useTranslations("pages.account.wishlist")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const { addItem } = useCartStore()
  const remove = useMutation(toggleWishlistItemMutation)
  const params = { handle: item.handle }
  const price = format.number(centsToDisplayAmount(item.priceMinorUnits), { currency: "PLN", style: "currency" })

  const handleRemove = useCallback(() => {
    remove.mutate(
      { productId: item.productId },
      {
        onError: () => {
          toast.error(t("removeError"))
        },
        onSuccess: () => {
          toast.success(t("removed"))
          void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEYS.ROOT })
        },
      },
    )
  }, [item.productId, queryClient, remove, t])

  const handleAddToCart = useCallback(() => {
    if (item.variantId === undefined) {
      return
    }

    addItem({
      id: item.variantId,
      image: item.thumbnail ?? "",
      price,
      rawPrice: item.priceMinorUnits,
      slug: item.handle,
      title: item.title,
      variantId: item.variantId,
      variantTitle: item.variantTitle ?? "",
    })
  }, [addItem, item, price])

  return (
    <li className="group">
      <LocalizedLink className="block" params={params} to={ROUTES.PRODUCT}>
        <div className="relative aspect-4/5 overflow-hidden bg-secondary">
          {item.thumbnail === undefined ? undefined : (
            <Image alt={item.title} className="size-full object-cover" height={750} src={item.thumbnail} width={600} />
          )}
          {(!item.available || !item.inStock) && (
            <span className="absolute top-3 left-3 bg-foreground px-3 py-1.5 text-[10px] font-medium tracking-[0.26em] text-background uppercase">
              {item.available ? t("outOfStock") : t("unavailable")}
            </span>
          )}
        </div>
      </LocalizedLink>

      <div className="mt-4 space-y-1">
        <LocalizedLink className="text-sm hover:underline" params={params} to={ROUTES.PRODUCT}>
          {item.title}
        </LocalizedLink>
        <p className="text-[13px] text-muted-foreground tabular-nums">{price}</p>
        <p className="text-[11px] text-muted-foreground/60">
          {t("addedAt", { date: format.dateTime(item.addedAt, { day: "numeric", month: "long", year: "numeric" }) })}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          className="h-9 flex-1 gap-2 text-[11px] tracking-[0.12em] uppercase"
          disabled={!item.available || !item.inStock || item.variantId === undefined}
          onClick={handleAddToCart}
          size="sm"
        >
          <ShoppingBag className="size-3.5" strokeWidth={1.5} />
          {t("addToCart")}
        </Button>
        <Button
          aria-label={t("remove")}
          className="size-9 shrink-0 text-muted-foreground"
          disabled={remove.isPending}
          onClick={handleRemove}
          size="icon"
          variant="outline"
        >
          <Trash2 className="size-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </li>
  )
}

interface WishlistGridProps {
  readonly items: readonly Wishlist["product"][]
}
