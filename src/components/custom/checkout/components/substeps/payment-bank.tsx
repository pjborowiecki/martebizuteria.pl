"use client";

import type { JSX } from "react";

import { useTranslations } from "use-intl";

export function PaymentBank(): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");

  return (
    <div className="rounded-none border border-border/50 bg-background p-5 text-sm leading-relaxed text-muted-foreground">
      {t("paymentSubsteps.bankTransfer")}
    </div>
  );
}
