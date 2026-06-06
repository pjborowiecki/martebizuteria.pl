import { type JSX, useEffect } from "react";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { resetCartAbandonedTracking } from "~/src/lib/customer-activity/customer-activity.tracking";

import { clearCheckoutDraft } from "~/src/components/custom/checkout/lib/checkout-draft";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { useCartStore } from "~/src/stores/cart.store";

export function CheckoutSuccess(): JSX.Element {
  const t = useTranslations("pages.checkout.checkoutSuccess");
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    clearCart();
    clearCheckoutDraft();
    resetCartAbandonedTracking();
  }, [clearCart]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center md:py-24">
      <CheckCircle2 className="size-16 text-success md:size-20" strokeWidth={1} />
      <div className="space-y-2">
        <h2 className="font-serif text-3xl md:text-4xl">{t("title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground md:text-base">{t("description")}</p>
      </div>
      <LocalizedLink
        to={CONSTANTS.ROUTES.HOME}
        className="mt-8 flex h-12 items-center justify-center bg-foreground px-8 text-xs tracking-[0.2em] text-background uppercase transition-colors hover:bg-foreground/90"
      >
        {t("continueShopping")}
      </LocalizedLink>
    </div>
  );
}
