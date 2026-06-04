import type { JSX } from "react";

import { useTranslations } from "use-intl";

export function DeliveryInStore(): JSX.Element {
  const t = useTranslations("pages.checkout.checkoutForm");

  return (
    <div className="flex flex-col gap-4 rounded-none border border-border/50 bg-background p-5">
      <p className="text-[13px] font-medium tracking-[0.15em] text-foreground uppercase">
        {t("deliverySubsteps.inStoreTitle", { fallback: "Odbiór Osobisty" })}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Odbierz zamówienie w naszym sklepie w Bochni, przy ulicy Wiśnickiej 12, w godzinach 09:00 - 17:00. Zostaniesz powiadomiony, gdy
        będzie gotowe.
      </p>
    </div>
  );
}
