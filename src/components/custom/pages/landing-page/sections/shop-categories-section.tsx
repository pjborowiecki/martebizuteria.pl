import { useMemo, type JSX } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { LANDING_SHOP_CATEGORIES } from "~/src/data/landing-data";

const ASPECT_RATIO_PORTRAIT = 0.8;

type CategoryItem = (typeof LANDING_SHOP_CATEGORIES)[number];

interface CategoryCardProps {
  category: CategoryItem;
  aspectRatioClass: string;
  sizes: string;
}

function CategoryCard({ category, aspectRatioClass, sizes }: Readonly<CategoryCardProps>): JSX.Element {
  const t = useTranslations("pages.landing.shopCategoriesSection");
  const params = useMemo(() => ({ handle: category.slug }), [category.slug]);

  return (
    <LocalizedLink className="group block" params={params} to={CONSTANTS.ROUTES.CATEGORY}>
      <AspectRatio className={`overflow-hidden bg-neutral-100 ${aspectRatioClass}`} ratio={ASPECT_RATIO_PORTRAIT}>
        <Image
          alt={t(category.nameKey)}
          className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
          height={800}
          sizes={sizes}
          src={category.image}
          width={1000}
        />
      </AspectRatio>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-xl tracking-tight lg:text-2xl">{t(category.nameKey)}</h3>
        <span className="text-[10px] tracking-[0.22em] text-foreground/35 uppercase">{t(category.countKey)}</span>
      </div>
    </LocalizedLink>
  );
}

export function ShopCategoriesSection(): JSX.Element {
  const t = useTranslations("pages.landing.shopCategoriesSection");

  const [cat1, cat2, cat3, cat4, cat5] = LANDING_SHOP_CATEGORIES;

  return (
    <section className="mx-auto max-w-400 px-6 pb-24 lg:px-12 lg:pb-36">
      <div className="reveal mb-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-18">
        <div className="space-y-4">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-5xl leading-[0.94] tracking-tight md:text-6xl lg:text-7xl">{t("title")}</h2>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
        </div>
        <LocalizedLink
          to={CONSTANTS.ROUTES.CATEGORIES}
          className="inline-flex h-12 shrink-0 items-center justify-center border border-foreground/20 px-8 text-[11px] tracking-[0.2em] uppercase transition-colors hover:border-foreground/50 sm:self-end"
        >
          {t("cta")}
        </LocalizedLink>
      </div>

      <div className="reveal grid gap-5 lg:grid-cols-[8fr_5fr] lg:gap-6">
        {cat1 !== undefined && <CategoryCard aspectRatioClass="lg:aspect-8/5" category={cat1} sizes="(max-width: 1024px) 100vw, 62vw" />}
        {cat2 !== undefined && <CategoryCard aspectRatioClass="lg:aspect-square" category={cat2} sizes="(max-width: 1024px) 100vw, 38vw" />}
      </div>

      <div className="reveal mt-10 grid grid-cols-2 gap-5 lg:mt-14 lg:grid-cols-[5fr_8fr] lg:gap-6">
        {cat3 !== undefined && <CategoryCard aspectRatioClass="lg:aspect-square" category={cat3} sizes="(max-width: 1024px) 50vw, 38vw" />}
        {cat4 !== undefined && <CategoryCard aspectRatioClass="lg:aspect-8/5" category={cat4} sizes="(max-width: 1024px) 50vw, 62vw" />}
      </div>

      <div className="reveal mt-10 grid gap-5 lg:mt-14 lg:grid-cols-[8fr_5fr] lg:gap-6">
        {cat5 !== undefined && <CategoryCard aspectRatioClass="lg:aspect-8/5" category={cat5} sizes="(max-width: 1024px) 100vw, 62vw" />}
        <div className="hidden lg:block" />
      </div>
    </section>
  );
}
