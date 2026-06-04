import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { LANDING_CATEGORY_PANELS } from "~/src/data/landing-data";

const ASPECT_RATIO_LANDSCAPE = 1.25;
const FIRST_INDEX = 0;

export function MobileCategoriesSection(): JSX.Element {
  const t = useTranslations("pages.landing.categoriesSection");

  return (
    <section className="mx-auto max-w-400 space-y-8 px-6 pb-8 lg:hidden lg:px-12">
      <div className="reveal">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-6">
        {LANDING_CATEGORY_PANELS.map((panel, index) => (
          <article key={panel.titleKey} className="reveal overflow-hidden border border-border/60 bg-background">
            <AspectRatio className="w-full overflow-hidden bg-muted" ratio={ASPECT_RATIO_LANDSCAPE}>
              <Image
                alt={t(panel.titleKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
                height={1000}
                priority={index === FIRST_INDEX}
                sizes="100vw"
                src={panel.image}
                width={1250}
              />
            </AspectRatio>
            <div className="space-y-3 px-1 py-5 sm:px-2 sm:py-6">
              <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t(panel.tagKey)}</p>
              <h3 className="font-serif text-2xl leading-[1.05] tracking-tight sm:text-3xl">{t(panel.titleKey)}</h3>
              <p className="max-w-prose text-sm/relaxed text-muted-foreground">{t(panel.subtitleKey)}</p>
              <LocalizedLink
                to={CONSTANTS.ROUTES.COLLECTIONS}
                className="inline-flex pt-1 text-[11px] tracking-[0.18em] text-foreground uppercase underline-offset-4 transition-colors hover:text-muted-foreground"
              >
                {t(panel.buttonTextKey)}
              </LocalizedLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
