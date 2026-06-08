import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getAssetURL } from "~/src/lib/utils";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

const ASPECT_RATIO_WIDE = 1.454_545;

export function MaisonHeritageSection(): JSX.Element {
  const t = useTranslations("pages.landing.maisonHeritageSection");

  return (
    <section id="marka" className="mx-auto max-w-400 px-6 py-16 lg:px-12 lg:py-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
        <div className="reveal space-y-5">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-5xl leading-[0.98]">{t("title")}</h2>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
          <LocalizedLink
            className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
            to={CONSTANTS.ROUTES.ABOUT}
          >
            {t("cta")}
          </LocalizedLink>
        </div>
        <div className="reveal relative mx-auto w-full max-w-2xl">
          <AspectRatio className="parallax-wrap overflow-hidden bg-card" ratio={ASPECT_RATIO_WIDE}>
            <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
              <Image
                alt={t("mainImageAlt")}
                className="absolute inset-0 size-full object-cover"
                height={1100}
                sizes="(max-width: 1024px) 100vw, 54vw"
                src={getAssetURL("marketing/about.webp")}
                width={1600}
              />
            </div>
          </AspectRatio>
          <AspectRatio
            ratio={1}
            className="parallax-wrap absolute -bottom-10 -left-8 hidden w-54 overflow-hidden border-8 border-background bg-card shadow-sm lg:block"
          >
            <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
              <Image
                alt={t("overlayImageAlt")}
                className="absolute inset-0 size-full object-cover"
                height={800}
                sizes="240px"
                src={getAssetURL("marketing/about2.webp")}
                width={800}
              />
            </div>
          </AspectRatio>
        </div>
      </div>
    </section>
  );
}
