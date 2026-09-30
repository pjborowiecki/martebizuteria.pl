import { type JSX, useCallback, useMemo } from "react"

import { Minus, Plus, X } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { getCartLineUnitPriceCents } from "~/src/modules/cart/cart.pricing"
import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

import { getProductImageUrl } from "~/src/lib/image"

import { Button } from "~/src/presentation/components/shadcn/button"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const CartItemCard = ({ item }: Readonly<CartItemCardProps>): JSX.Element => {
  const t = useTranslations("pages.cart")
  const format = useFormatter()
  const { removeItem, updateQuantity } = useCartStore()
  const { issuesByVariantId } = useCartAvailability()
  const availabilityIssue = issuesByVariantId.get(item.variantId)
  const isUnavailable = availabilityIssue !== undefined && availabilityIssue.available < item.qty
  const canIncrease = availabilityIssue === undefined || item.qty < availabilityIssue.available
  const unitPriceLabel = format.number(centsToDisplayAmount(getCartLineUnitPriceCents(item)), {
    currency: "PLN",
    style: "currency",
  })

  const handleDecrease = useCallback(() => {
    updateQuantity(item.id, item.qty - 1)
  }, [item.id, item.qty, updateQuantity])

  const handleIncrease = useCallback(() => {
    updateQuantity(item.id, item.qty + 1)
  }, [item.id, item.qty, updateQuantity])

  const handleRemove = useCallback(() => {
    removeItem(item.id)
  }, [item.id, removeItem])

  const productParams = useMemo(
    () => ({
      handle: item.slug,
    }),
    [item.slug],
  )

  return (
    <div className="grid grid-cols-[100px_1fr] gap-5 py-6 sm:grid-cols-[120px_1fr] sm:gap-6 lg:grid-cols-[140px_1fr] lg:py-8">
      <LocalizedLink className="group relative aspect-4/5 overflow-hidden bg-secondary" params={productParams} to={ROUTES.PRODUCT}>
        <Image
          alt={item.title}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          height={200}
          sizes="140px"
          src={getProductImageUrl(item.image)}
          width={160}
        />
      </LocalizedLink>

      <div className="flex min-w-0 flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <LocalizedLink
              className="font-serif text-base tracking-tight transition-colors hover:text-muted-foreground sm:text-lg"
              params={productParams}
              to={ROUTES.PRODUCT}
            >
              {item.title}
            </LocalizedLink>
            {item.variantTitle !== "" && <p className="mt-1 text-xs text-muted-foreground">{item.variantTitle}</p>}
            {isUnavailable && (
              <p className="mt-2 text-xs text-destructive">
                {availabilityIssue.available <= 0
                  ? t("availability.itemUnavailable")
                  : t("availability.itemLimited", {
                      available: availabilityIssue.available,
                    })}
              </p>
            )}
          </div>
          <Button
            aria-label={t("removeItem")}
            className="size-8 rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={handleRemove}
            type="button"
            variant="ghost"
          >
            <X className="size-4" strokeWidth={1.25} />
          </Button>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="flex h-9 items-center border border-foreground/15">
            <Button
              aria-label={t("decreaseQty")}
              className="size-9 rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground"
              disabled={item.qty <= 1}
              onClick={handleDecrease}
              type="button"
              variant="ghost"
            >
              <Minus className="size-3" strokeWidth={1.5} />
            </Button>
            <span className="flex w-8 items-center justify-center text-xs tabular-nums">{item.qty}</span>
            <Button
              aria-label={t("increaseQty")}
              className="size-9 rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground"
              disabled={!canIncrease}
              onClick={handleIncrease}
              type="button"
              variant="ghost"
            >
              <Plus className="size-3" strokeWidth={1.5} />
            </Button>
          </div>

          <p className="text-sm tracking-wide tabular-nums">{unitPriceLabel}</p>
        </div>
      </div>
    </div>
  )
}

interface CartItemCardProps {
  readonly item: CartItem
}
