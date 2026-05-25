import type { JSX } from "react";

import { Lock } from "lucide-react";
import { useTranslations } from "use-intl";

import { LocalizedLink } from "~/src/components/custom/localized-link";

export function CheckoutHeader(): JSX.Element {
  const tNav = useTranslations("components.custom.navigation");
  const tCheckout = useTranslations("checkoutPage");

  return (
    <header className="mb-10 flex items-center justify-between gap-6 pb-2 md:mb-12">
      <LocalizedLink to="/" className="font-serif text-2xl leading-none tracking-tight text-foreground uppercase md:text-3xl">
        {tNav("brand")}
      </LocalizedLink>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-xs font-medium tracking-[0.28em] text-muted-foreground uppercase">{tCheckout("secureCheckout")}</span>
        <Lock aria-hidden className="size-4 shrink-0 text-foreground/70" strokeWidth={1.15} />
      </div>
    </header>
  );
}
