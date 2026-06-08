import { type JSX, type MouseEvent, useCallback, useRef, useState } from "react";

import { Heart, Share2, ShoppingBag } from "lucide-react";
import { useTranslations } from "use-intl";

import { trackCartItemAdded } from "~/src/lib/customer-activity/customer-activity.tracking";
import { cn } from "~/src/lib/utils";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink, type LocalizedTo } from "~/src/components/custom/localized-link";

import { useProductCardImageHover } from "~/src/hooks/use-product-card-image-hover";
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils";
import { useCartStore } from "~/src/stores/cart.store";

const ADD_TO_CART_TIMEOUT_MS = 1800;
const DEFAULT_ADD_QUANTITY = 1;

export interface ProductCardProps {
  readonly badge?: string;
  readonly className?: string;
  readonly compact?: boolean;
  readonly detail: string;
  readonly href: LocalizedTo;
  readonly params?: Readonly<Record<string, string | number | undefined>>;
  readonly image: string;
  readonly name: string;
  readonly onAddToCart?: () => void;
  readonly onWishlistToggle?: () => void;
  readonly parallax?: boolean;
  readonly priority?: boolean;
  readonly price?: string;
  readonly rawPrice?: number;
  readonly sizes?: string;
  readonly slug?: string;
  readonly variantId?: string;
  readonly variantTitle?: string;
  readonly wishlisted?: boolean;
}

function useProductCardLogic({
  href,
  image,
  initialWishlisted,
  name,
  onAddToCart,
  onWishlistToggle,
  price,
  rawPrice,
  slug,
  variantId,
  variantTitle
}: {
  href: LocalizedTo;
  image: string;
  initialWishlisted: boolean;
  name: string;
  onAddToCart?: () => void;
  onWishlistToggle?: () => void;
  price?: string;
  rawPrice?: number;
  slug?: string;
  variantId?: string;
  variantTitle?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [justAdded, setJustAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(globalThis.undefined);
  const { addItem } = useCartStore();

  const stop = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleWishlist = useCallback(
    (e: MouseEvent) => {
      stop(e);
      setWishlisted((w) => !w);
      if (onWishlistToggle !== undefined) {
        onWishlistToggle();
      }
    },
    [stop, onWishlistToggle]
  );

  const handleAddToCart = useCallback(
    (e: MouseEvent) => {
      stop(e);

      if (variantId === undefined || slug === undefined || rawPrice === undefined) {
        return;
      }

      const resolvedVariantTitle = variantTitle ?? "";

      const normalizedVariantTitle = resolvedVariantTitle === DEFAULT_VARIANT_TITLE ? "" : resolvedVariantTitle;

      addItem({
        id: variantId,
        image,
        price: price ?? "",
        rawPrice,
        slug,
        title: name,
        variantId,
        variantTitle: normalizedVariantTitle
      });

      trackCartItemAdded({
        productTitle: name,
        quantity: DEFAULT_ADD_QUANTITY,
        variantId,
        variantTitle: normalizedVariantTitle
      });

      setJustAdded(true);

      if (onAddToCart !== undefined) {
        onAddToCart();
      }

      if (timeoutRef.current !== undefined) {
        globalThis.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = globalThis.setTimeout(() => {
        setJustAdded(false);
      }, ADD_TO_CART_TIMEOUT_MS);
    },
    [stop, addItem, slug, variantId, variantTitle, image, price, rawPrice, name, onAddToCart]
  );

  const handleShare = useCallback(
    (e: MouseEvent) => {
      stop(e);
      const shareAsync = async () => {
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title: name, url: href });
          } catch {
            // ignore
          }
        } else {
          try {
            await navigator.clipboard.writeText(globalThis.location.origin + href);
          } catch {
            // ignore
          }
        }
      };

      void shareAsync();
    },
    [stop, name, href]
  );

  return { handleAddToCart, handleShare, handleWishlist, justAdded, wishlisted };
}

export function ProductCard({
  badge,
  className,
  compact = false,
  detail,
  href,
  params,
  image,
  name,
  onAddToCart,
  onWishlistToggle,
  parallax = false,
  priority = false,
  price,
  rawPrice,
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw",
  slug,
  variantId,
  variantTitle,
  wishlisted: initialWishlisted = false
}: Readonly<ProductCardProps>): JSX.Element {
  const t = useTranslations("components.custom.productCard");
  const imageHoverRef = useRef<HTMLDivElement>(null);
  const { handleMouseEnter, handleMouseLeave } = useProductCardImageHover(imageHoverRef);
  const { handleAddToCart, handleShare, handleWishlist, justAdded, wishlisted } = useProductCardLogic({
    href,
    image,
    initialWishlisted,
    name,
    onAddToCart,
    onWishlistToggle,
    price,
    rawPrice,
    slug,
    variantId,
    variantTitle
  });

  return (
    <LocalizedLink className={cn("group/card block", className)} to={href} params={params}>
      {/* ── Image container ── */}
      <div
        className={cn("relative aspect-4/5 overflow-hidden bg-secondary", parallax && "parallax-wrap")}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image layer — scale animates on an inner wrapper so scroll parallax stays smooth */}
        <div className={cn(parallax ? "parallax-img absolute inset-x-0 inset-y-[-8%]" : "absolute inset-0")}>
          <div ref={imageHoverRef} className="size-full will-change-transform">
            <Image src={image} alt={name} width={600} height={750} sizes={sizes} priority={priority} className="size-full object-cover" />
          </div>
        </div>

        {/* Badge */}
        {badge !== undefined && (
          <span className="absolute top-3 left-3 z-10 bg-foreground px-3 py-1.5 text-[10px] font-medium tracking-[0.26em] text-background uppercase">
            {badge}
          </span>
        )}

        {/* ── Top-right actions ── */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? t("removeFromWishlist") : t("addToWishlist")}
            className={cn(
              "flex size-11 cursor-pointer items-center justify-center transition-all duration-300",
              wishlisted ? "opacity-100" : "opacity-0 group-hover/card:opacity-100 max-lg:opacity-100"
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

        {/* ── Bottom overlay: Add to Cart ── */}
        <div className="absolute inset-x-0 bottom-0 z-10 translate-y-0 px-4 pb-4 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] max-lg:translate-y-0 lg:translate-y-full lg:group-hover/card:translate-y-0">
          <button
            type="button"
            onClick={handleAddToCart}
            className={cn(
              "flex h-12 w-full cursor-pointer items-center justify-center gap-2 text-[11px] font-medium tracking-[0.22em] uppercase transition-all duration-300",
              justAdded ? "bg-foreground text-background" : "bg-background/95 text-foreground backdrop-blur-md hover:bg-background"
            )}
          >
            <ShoppingBag className="size-4" strokeWidth={1.4} />
            {justAdded ? t("added") : t("addToCart")}
          </button>
        </div>
      </div>

      {/* ── Product info ── */}
      <div className={cn("mt-4", compact ? "space-y-1" : "space-y-1.5")}>
        <h3
          className={cn(
            "font-serif leading-snug transition-colors duration-500 group-hover/card:text-muted-foreground",
            compact ? "text-base" : "text-base lg:text-lg"
          )}
        >
          {name}
        </h3>
        <p className="text-xs text-muted-foreground">{detail}</p>
        {price !== undefined && <p className={cn("text-[11px] tracking-[0.22em] uppercase tabular-nums", !compact && "mt-1")}>{price}</p>}
      </div>
    </LocalizedLink>
  );
}
