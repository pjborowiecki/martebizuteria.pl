import type { JSX } from "react";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "use-intl";

import { useCartAvailability } from "~/src/hooks/use-cart-availability";
import { useCartStore } from "~/src/stores/cart.store";

const EMPTY_CART = 0;

export function CartAvailabilityBanner(): JSX.Element | undefined {
  const t = useTranslations("pages.cart.availability");
  const items = useCartStore((state) => state.items);
  const { hasUnavailableItems, isChecking } = useCartAvailability();

  if (items.length === EMPTY_CART || isChecking || !hasUnavailableItems) {
    return undefined;
  }

  return (
    <div
      className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
      role="alert"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2">
        <AlertTriangle aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        <p>{t("banner")}</p>
      </div>
    </div>
  );
}
