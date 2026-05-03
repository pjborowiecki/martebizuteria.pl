import { type JSX, type MouseEvent, useCallback, useRef, useState } from "react";

import { Heart, Share2, ShoppingBag } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink, type LocalizedTo } from "~/src/components/custom/localized-link";

const ADD_TO_CART_TIMEOUT_MS = 1800;

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
  readonly price?: string;
  readonly sizes?: string;
  readonly wishlisted?: boolean;
}

function useProductCardLogic({
  href,
  initialWishlisted,
  name,
  onAddToCart,
  onWishlistToggle
}: {
  href: LocalizedTo;
  initialWishlisted: boolean;
  name: string;
  onAddToCart?: () => void;
  onWishlistToggle?: () => void;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [justAdded, setJustAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(globalThis.undefined);

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
    [stop, onAddToCart]
  );

  const handleShare = useCallback(
    (e: MouseEvent) => {
      stop(e);
      const shareAsync = async () => {
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title: name, url: href as string });
          } catch {
            // ignore
          }
        } else {
          try {
            await navigator.clipboard.writeText(globalThis.location.origin + (href as string));
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
  price,
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw",
  wishlisted: initialWishlisted = false
}: Readonly<ProductCardProps>): JSX.Element {
  const t = useTranslations("components.custom.productCard");
  const { handleAddToCart, handleShare, handleWishlist, justAdded, wishlisted } = useProductCardLogic({
    href,
    initialWishlisted,
    name,
    onAddToCart,
    onWishlistToggle
  });

  return (
    <LocalizedLink className={cn("group/card block", className)} to={href} params={params}>
      {/* ── Image container ── */}
      <div className={cn("relative aspect-4/5 overflow-hidden bg-secondary", parallax && "parallax-wrap")}>
        {/* Image layer */}
        <div className={cn(parallax ? "parallax-img absolute inset-x-0 inset-y-[-8%]" : "absolute inset-0")}>
          <Image
            src={image}
            alt={name}
            height={960}
            width={768}
            sizes={sizes}
            className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform group-hover/card:scale-[1.06]"
          />
        </div>

        {/* Hover darkening */}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover/card:bg-black/10" />

        {/* Bottom gradient — always subtle, stronger on hover */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/0 transition-opacity duration-500 group-hover/card:from-black/40" />

        {/* Badge (New, Bestseller, etc.) */}
        {badge !== undefined && (
          <span className="absolute top-3 left-3 z-10 bg-background px-2.5 py-1 text-[9px] font-medium tracking-[0.22em] uppercase">
            {badge}
          </span>
        )}

        {/* ── Top-right actions: Wishlist + Share ── */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? t("removeFromWishlist") : t("addToWishlist")}
            className={cn(
              "backdrop-blur-0 flex size-11 cursor-pointer items-center justify-center bg-background/0 transition-all duration-300",
              "opacity-0 group-hover/card:opacity-100",
              wishlisted && "opacity-100"
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
            className="flex size-11 cursor-pointer items-center justify-center opacity-0 transition-all duration-300 group-hover/card:opacity-100"
          >
            <Share2 className="size-[18px] text-white" strokeWidth={1.3} />
          </button>
        </div>

        {/* ── Bottom overlay: Add to Cart ── */}
        <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full px-4 pb-4 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover/card:translate-y-0">
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
