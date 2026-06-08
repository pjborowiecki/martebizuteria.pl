import { type JSX, Suspense, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";
import {
  resolveLandingCategoryPanelCopy,
  type LandingCategoryPanel
} from "~/src/components/custom/pages/landing-page/sections/landing-category-panel.utils";

import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";

const ASPECT_RATIO_LANDSCAPE = 1.25;
const FIRST_INDEX = 0;
const SKELETON_PANEL_COUNT = 3;

function MobileCategoryPanel({ category, index }: Readonly<{ category: LandingCategoryPanel; index: number }>): JSX.Element {
  const locale = useLocale();
  const t = useTranslations("pages.landing.categoriesSection");
  const panel = resolveLandingCategoryPanelCopy(category, locale);
  const params = useMemo(() => ({ handle: panel.handle }), [panel.handle]);

  return (
    <article className="reveal overflow-hidden border border-border/60 bg-background">
      <AspectRatio className="w-full overflow-hidden bg-muted" ratio={ASPECT_RATIO_LANDSCAPE}>
        <Image
          alt={panel.title}
          className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
          height={1000}
          priority={index === FIRST_INDEX}
          sizes="100vw"
          src={panel.image}
          width={1250}
        />
      </AspectRatio>
      <div className="space-y-3 px-1 py-5 sm:px-2 sm:py-6">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{panel.tag}</p>
        <h3 className="font-serif text-2xl leading-[1.05] tracking-tight sm:text-3xl">{panel.title}</h3>
        <p className="max-w-prose text-sm/relaxed text-muted-foreground">{panel.subtitle}</p>
        <LocalizedLink
          className="inline-flex pt-1 text-[11px] tracking-[0.18em] text-foreground uppercase underline-offset-4 transition-colors hover:text-muted-foreground"
          params={params}
          to={CONSTANTS.ROUTES.CATEGORY}
        >
          {t("discoverCategory", { category: panel.tag })}
        </LocalizedLink>
      </div>
    </article>
  );
}

function MobileCategoriesPanels(): JSX.Element {
  const { data: categories } = useSuspenseQuery(categoryQueryOptions.categoriesQueryOptions());

  return (
    <div className="space-y-6">
      {categories.map((category, index) => (
        <MobileCategoryPanel key={category.id} category={category} index={index} />
      ))}
    </div>
  );
}

function MobileCategoriesPanelsSkeleton(): JSX.Element {
  return (
    <div className="space-y-6" aria-busy="true" aria-hidden="true">
      {Array.from({ length: SKELETON_PANEL_COUNT }, (_, index) => (
        <div key={index} className="overflow-hidden border border-border/60 bg-background">
          <Skeleton className="aspect-5/4 w-full rounded-none" />
          <div className="space-y-3 px-1 py-5 sm:px-2 sm:py-6">
            <Skeleton className="h-3 w-24 rounded-none" />
            <Skeleton className="h-8 w-48 rounded-none" />
            <Skeleton className="h-14 w-full max-w-sm rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

const MOBILE_CATEGORIES_PANELS_SUSPENSE_FALLBACK = <MobileCategoriesPanelsSkeleton />;

export function MobileCategoriesSection(): JSX.Element {
  const t = useTranslations("pages.landing.categoriesSection");

  return (
    <section className="mx-auto max-w-400 space-y-8 px-6 pb-8 lg:hidden lg:px-12">
      <div className="reveal">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
      </div>

      <Suspense fallback={MOBILE_CATEGORIES_PANELS_SUSPENSE_FALLBACK}>
        <MobileCategoriesPanels />
      </Suspense>
    </section>
  );
}
