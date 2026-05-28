import { type JSX, useCallback, useMemo } from "react";

import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getProductImageUrl } from "~/src/lib/_utils/image";

import { Button } from "~/src/components/shadcn/button";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { type CartItem, useCartStore } from "~/src/stores/cart.store";

const QUANTITY_STEP = 1;

export interface CartItemCardProps {
  readonly item: CartItem;
}

export function CartItemCard({ item }: Readonly<CartItemCardProps>): JSX.Element {
  const t = useTranslations("cartPage");
  const { removeItem, updateQuantity } = useCartStore();

  const handleDecrease = useCallback(() => {
    updateQuantity(item.id, item.qty - QUANTITY_STEP);
  }, [item.id, item.qty, updateQuantity]);

  const handleIncrease = useCallback(() => {
    updateQuantity(item.id, item.qty + QUANTITY_STEP);
  }, [item.id, item.qty, updateQuantity]);

  const handleRemove = useCallback(() => {
    removeItem(item.id);
  }, [item.id, removeItem]);

  const productParams = useMemo(() => ({ handle: item.slug }), [item.slug]);

  return (
    <div className="grid grid-cols-[100px_1fr] gap-5 py-6 sm:grid-cols-[120px_1fr] sm:gap-6 lg:grid-cols-[140px_1fr] lg:py-8">
      <LocalizedLink
        className="group relative aspect-4/5 overflow-hidden bg-secondary"
        params={productParams}
        to={CONSTANTS.ROUTES.PRODUCT}
      >
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
              to={CONSTANTS.ROUTES.PRODUCT}
            >
              {item.title}
            </LocalizedLink>
            <p className="mt-1 text-xs text-muted-foreground">{item.material}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.size}</p>
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
              disabled={item.qty <= QUANTITY_STEP}
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
              onClick={handleIncrease}
              type="button"
              variant="ghost"
            >
              <Plus className="size-3" strokeWidth={1.5} />
            </Button>
          </div>

          <p className="text-sm tracking-wide">
            {(() => {
              const CENTS_IN_ZLOTY = 100;
              const FALLBACK_PRICE = 0;
              return new Intl.NumberFormat("pl-PL", { currency: "PLN", style: "currency" }).format(
                (item.rawPrice ??
                  (isNaN(parseFloat((item.price ?? "0").replaceAll(/[^0-9,.]/gu, "").replaceAll(",", ".")))
                    ? FALLBACK_PRICE
                    : parseFloat((item.price ?? "0").replaceAll(/[^0-9,.]/gu, "").replaceAll(",", ".")) * CENTS_IN_ZLOTY)) / CENTS_IN_ZLOTY
              );
            })()}
          </p>
        </div>
      </div>
    </div>
  );
}
