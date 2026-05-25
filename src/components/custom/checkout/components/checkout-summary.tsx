"use client";

import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Image } from "~/src/components/custom/image";

export function CheckoutSummary(): JSX.Element {
  const t = useTranslations("checkoutPage");

  return (
    <aside className="sticky top-24 border border-border/30 bg-muted/30 p-6 text-card-foreground md:p-8">
      <h2 className="mb-8 font-serif text-3xl tracking-tight text-foreground md:text-4xl">{t("checkoutSummary.title")}</h2>

      <div className="mb-8 flex items-center gap-4 border-b border-border/40 pb-8">
        <div className="relative size-16 shrink-0 bg-muted/40">
          <Image
            src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=200&q=80"
            alt="Aura Hoop I"
            width={64}
            height={64}
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-sm font-normal tracking-[0.12em] text-foreground uppercase">{t("checkoutForm.placeholderItemName")}</h4>
          <p className="text-xs text-muted-foreground italic">{t("checkoutForm.placeholderItemDetails")}</p>
          <p className="mt-1 font-medium text-foreground tabular-nums">{t("checkoutForm.placeholderItemPrice")}</p>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">{t("checkoutSummary.subtotal")}</span>
          <span className="font-medium text-foreground tabular-nums">{t("checkoutForm.placeholderItemPrice")}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">{t("checkoutSummary.delivery")}</span>
          <span className="text-muted-foreground tabular-nums">{t("checkoutSummary.deliveryCalculated")}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-border/40 pt-6 font-medium">
          <span className="text-lg font-medium tracking-[0.16em] text-foreground uppercase">{t("checkoutSummary.total")}</span>
          <span className="font-medium text-foreground tabular-nums">{t("checkoutForm.placeholderItemPrice")}</span>
        </div>
      </div>
    </aside>
  );
}
