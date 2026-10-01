import { type JSX, type MouseEvent, useCallback, useRef, useState } from "react"

import { useRouter } from "@tanstack/react-router"
import { cn } from "cn"
import { Heart, Share2, ShoppingBag } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { trackCartItemAdded } from "~/src/modules/customer-activity/customer-activity.tracking"
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils"

import { useProductCardImageHover } from "~/src/hooks/use-product-card-image-hover"
import { useWishlist } from "~/src/hooks/use-wishlist"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink, type LocalizedTo } from "~/src/presentation/components/custom/localized-link"

const useProductCardLogic = ({
  href,
  image,
  name,
  onAddToCart,
  price,
  productId,
  rawPrice,
  slug,
  variantId,
  variantTitle,
}: ProductCardLogicInput) => {
  const [justAdded, setJustAdded] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(globalThis.undefined)
  const { addItem } = useCartStore()
  const { isWishlisted, toggle: toggleWishlist } = useWishlist()
  const wishlisted = isWishlisted(productId)
  const stop = useCallback((event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleWishlist = useCallback(
    (event: MouseEvent) => {
      stop(event)
      toggleWishlist(productId)
    },
    [productId, stop, toggleWishlist],
  )

  const handleAddToCart = useCallback(
    (event: MouseEvent) => {
      stop(event)
      if (variantId === undefined || slug === undefined || rawPrice === undefined) {
        return
      }

      const resolvedVariantTitle = variantTitle ?? ""
      const normalizedVariantTitle = resolvedVariantTitle === DEFAULT_VARIANT_TITLE ? "" : resolvedVariantTitle
      addItem({
        id: variantId,
        image,
        price: price ?? "",
        rawPrice,
        slug,
        title: name,
        variantId,
        variantTitle: normalizedVariantTitle,
      })
      trackCartItemAdded({
        productTitle: name,
        quantity: DEFAULT_ADD_QUANTITY,
        variantId,
        variantTitle: normalizedVariantTitle,
      })
      setJustAdded(true)
      if (onAddToCart !== undefined) {
        onAddToCart()
      }

      if (timeoutRef.current !== undefined) {
        globalThis.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = globalThis.setTimeout(() => {
        setJustAdded(false)
      }, ADD_TO_CART_TIMEOUT_MS)
    },
    [stop, addItem, slug, variantId, variantTitle, image, price, rawPrice, name, onAddToCart],
  )

  const handleShare = useCallback(
    (event: MouseEvent) => {
      stop(event)
      const shareAsync = async () => {
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title: name, url: href })
          } catch {}
        } else {
          try {
            await navigator.clipboard.writeText(globalThis.location.origin + href)
          } catch {}
        }
      }
      void shareAsync()
    },
    [stop, name, href],
  )

  return {
    handleAddToCart,
    handleShare,
    handleWishlist,
    justAdded,
    wishlisted,
  }
}

export const ProductCard = ({
  badge,
  className,
  compact = false,
  detail,
  href,
  params,
  image,
  name,
  onAddToCart,
  parallax = false,
  priority = false,
  price,
  productId,
  rawPrice,
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw",
  slug,
  variantId,
  variantTitle,
}: Readonly<ProductCardProps>): JSX.Element => {
  const t = useTranslations("components.custom.productCard")
  const router = useRouter()
  const productHref = router.buildLocation({ params: params ?? true, to: href }).href
  const imageHoverRef = useRef<HTMLDivElement>(null)
  const { handleMouseEnter, handleMouseLeave } = useProductCardImageHover(imageHoverRef)
  const { handleAddToCart, handleShare, handleWishlist, justAdded, wishlisted } = useProductCardLogic({
    href: productHref,
    image,
    name,
    onAddToCart,
    price,
    productId,
    rawPrice,
    slug,
    variantId,
    variantTitle,
  })

  return (
    <LocalizedLink className={cn("group/card block", className)} to={href} params={params}>
      <div
        className={cn("relative aspect-4/5 overflow-hidden bg-secondary", parallax && "parallax-wrap")}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={cn(parallax ? "parallax-img absolute inset-x-0 inset-y-[-8%]" : "absolute inset-0")}>
          <div ref={imageHoverRef} className="size-full will-change-transform">
            <Image src={image} alt={name} width={600} height={750} sizes={sizes} priority={priority} className="size-full object-cover" />
          </div>
        </div>

        {badge !== undefined && (
          <span className="absolute top-3 left-3 z-10 bg-foreground px-3 py-1.5 text-[10px] font-medium tracking-[0.26em] text-background uppercase">
            {badge}
          </span>
        )}

        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? t("removeFromWishlist") : t("addToWishlist")}
            className={cn(
              "flex size-11 cursor-pointer items-center justify-center transition-all duration-300",
              wishlisted ? "opacity-100" : "opacity-0 group-hover/card:opacity-100 max-lg:opacity-100",
            )}
          >
            <Heart
              className={cn("size-[20px] transition-all duration-300", wishlisted ? "fill-foreground text-foreground" : "text-white")}
              strokeWidth={1.3}
            />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={t("share")}
            className="flex size-11 cursor-pointer items-center justify-center transition-all duration-300 max-lg:opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100"
          >
            <Share2 className="size-[18px] text-white" strokeWidth={1.3} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 translate-y-0 px-4 pb-4 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] max-lg:translate-y-0 lg:translate-y-full lg:group-hover/card:translate-y-0">
          <button
            type="button"
            onClick={handleAddToCart}
            className={cn(
              "flex h-12 w-full cursor-pointer items-center justify-center gap-2 text-[11px] font-medium tracking-[0.22em] uppercase transition-all duration-300",
              justAdded ? "bg-foreground text-background" : "bg-background/95 text-foreground backdrop-blur-md hover:bg-background",
            )}
          >
            <ShoppingBag className="size-4" strokeWidth={1.4} />
            {justAdded ? t("added") : t("addToCart")}
          </button>
        </div>
      </div>

      <div className={cn("mt-4", compact ? "space-y-1" : "space-y-1.5")}>
        <h3
          className={cn(
            "font-serif leading-snug transition-colors duration-500 group-hover/card:text-muted-foreground",
            compact ? "text-base" : "text-base lg:text-lg",
          )}
        >
          {name}
        </h3>
        <p className="text-xs text-muted-foreground">{detail}</p>
        {price !== undefined && <p className={cn("text-[11px] tracking-[0.22em] uppercase tabular-nums", !compact && "mt-1")}>{price}</p>}
      </div>
    </LocalizedLink>
  )
}

const ADD_TO_CART_TIMEOUT_MS = 1800

const DEFAULT_ADD_QUANTITY = 1

type ProductCardLogicInput = Pick<
  ProductCardProps,
  "image" | "name" | "onAddToCart" | "price" | "productId" | "rawPrice" | "slug" | "variantId" | "variantTitle"
> & {
  readonly href: string
}

interface ProductCardProps {
  readonly badge?: string | undefined
  readonly className?: string | undefined
  readonly compact?: boolean | undefined
  readonly detail: string
  readonly href: LocalizedTo
  readonly params?: Readonly<Record<string, string | number | undefined>> | undefined
  readonly image: string
  readonly name: string
  readonly onAddToCart?: (() => void) | undefined
  readonly parallax?: boolean | undefined
  readonly priority?: boolean | undefined
  readonly price?: string | undefined
  readonly productId: string
  readonly rawPrice?: number | undefined
  readonly sizes?: string | undefined
  readonly slug?: string | undefined
  readonly variantId?: string | undefined
  readonly variantTitle?: string | undefined
}
