import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { ProductCard } from "~/src/components/custom/product-card";

import { LANDING_PRODUCTS } from "~/src/data/landing-data";

export function NewArrivalsSection(): JSX.Element {
  const t = useTranslations("landingPage.newArrivalsSection");

  return (
    <section id="nowosci" className="mx-auto max-w-400 space-y-10 px-6 pt-20 pb-20 lg:px-12 lg:pt-28 lg:pb-28">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
        </div>
        <LocalizedLink
          to="/products"
          className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("cta")}
        </LocalizedLink>
      </div>

      <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {LANDING_PRODUCTS.map((item) => (
          <ProductCard
            key={item.nameKey}
            href="/products"
            image={item.image}
            name={t(item.nameKey)}
            detail={t(item.detailsKey)}
            price={t(item.priceKey)}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 30vw"
            parallax
            className="reveal"
          />
        ))}
      </div>
    </section>
  );
}
