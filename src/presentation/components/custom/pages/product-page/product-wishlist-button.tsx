import { type JSX, useCallback } from "react"

import { Heart } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { useWishlist } from "~/src/hooks/use-wishlist"

import { Button } from "~/src/presentation/components/shadcn/button"

export const ProductWishlistButton = ({ productId }: Readonly<{ productId: string }>): JSX.Element => {
  const t = useTranslations("components.custom.productCard")
  const { isWishlisted, toggle } = useWishlist()
  const wishlisted = isWishlisted(productId)

  const handleClick = useCallback(() => {
    toggle(productId)
  }, [productId, toggle])

  return (
    <Button className="h-11 w-full gap-2.5 text-[11px] tracking-[0.18em] uppercase" onClick={handleClick} type="button" variant="outline">
      <Heart className={wishlisted ? "size-4 fill-current" : "size-4"} strokeWidth={1.3} />
      {wishlisted ? t("removeFromWishlist") : t("addToWishlist")}
    </Button>
  )
}
