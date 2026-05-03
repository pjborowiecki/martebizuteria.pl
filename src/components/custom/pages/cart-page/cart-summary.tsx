import { type JSX, useCallback } from "react";

import { ShoppingBag, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

export interface CartSummaryProps {
  readonly subtotal: string;
}

export function CartSummary({ subtotal }: Readonly<CartSummaryProps>): JSX.Element {
  const t = useTranslations("cartPage");

  const handleCheckout = useCallback(() => {
    alert("Checkout flow is under construction.");
  }, []);

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="space-y-6 border border-border p-6 sm:p-8">
        <h2 className="font-serif text-xl tracking-tight">{t("summary.title")}</h2>
        <Separator className="bg-border" />

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("summary.subtotal")}</span>
            <span>{subtotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("summary.shipping")}</span>
            <span className="text-muted-foreground">{t("summary.shippingValue")}</span>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="flex justify-between">
          <span className="font-medium">{t("summary.total")}</span>
          <span className="font-medium">{subtotal}</span>
        </div>

        <Button
          className="h-13 w-full rounded-none bg-primary text-sm font-medium tracking-wide text-primary-foreground hover:bg-primary/90"
          onClick={handleCheckout}
          type="button"
        >
          {t("summary.checkout")}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/50">{t("summary.note")}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2.5 text-muted-foreground/60">
          <ShoppingBag className="size-4 shrink-0" strokeWidth={1.25} />
          <span className="text-[11px] leading-tight">{t("trust.freeShipping")}</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground/60">
          <Trash2 className="size-4 shrink-0" strokeWidth={1.25} />
          <span className="text-[11px] leading-tight">{t("trust.freeReturns")}</span>
        </div>
      </div>
    </aside>
  );
}
