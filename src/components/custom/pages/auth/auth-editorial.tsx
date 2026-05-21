import type { JSX } from "react";

import { useTranslations } from "use-intl";

const AUTH_IMAGE = "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1400&q=85";

export function AuthEditorial(): JSX.Element {
  const t = useTranslations("components.custom.authLayout");

  return (
    <div className="relative hidden overflow-hidden bg-secondary lg:block">
      <img src={AUTH_IMAGE} alt={t("imageAlt")} className="absolute inset-0 size-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-primary/10" />
      <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
        <p className="font-serif text-3xl leading-snug text-background [text-shadow:0_2px_24px_rgba(0,0,0,0.4)] xl:text-4xl">
          {t("imageQuote")}
        </p>
        <p className="mt-3 text-[11px] tracking-[0.22em] text-background/60 uppercase">{t("imageAttribution")}</p>
      </div>
    </div>
  );
}
