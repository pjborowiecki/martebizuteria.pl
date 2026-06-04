import type { JSX } from "react";

import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Separator } from "~/src/components/shadcn/separator";

import { LocalizedLink } from "~/src/components/custom/localized-link";

export interface CartSummaryProps {
  readonly subtotal: string;
}

export function CartSummary({ subtotal }: Readonly<CartSummaryProps>): JSX.Element {
  const t = useTranslations("pages.cart");

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="space-y-6 border border-foreground/10 p-6 sm:p-8">
        <h2 className="font-serif text-xl tracking-tight">{t("summary.title")}</h2>
        <Separator className="bg-foreground/10" />

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

        <Separator className="bg-foreground/10" />

        <div className="flex justify-between">
          <span className="font-medium">{t("summary.total")}</span>
          <span className="font-medium">{subtotal}</span>
        </div>

        <LocalizedLink
          to={CONSTANTS.ROUTES.CHECKOUT}
          className="flex h-13 w-full items-center justify-center bg-primary text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("summary.checkout")}
        </LocalizedLink>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/50">{t("summary.note")}</p>
      </div>

      {/* Trust signals */}
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <ShieldCheck className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="text-xs leading-tight">{t("trust.securePayment")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Truck className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="text-xs leading-tight">{t("trust.freeShipping")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <RotateCcw className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="text-xs leading-tight">{t("trust.returns")}</span>
        </div>
      </div>
    </aside>
  );
}
