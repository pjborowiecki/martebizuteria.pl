import { type JSX, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { getAssetURL } from "~/src/lib/url"

import { AspectRatio } from "~/src/presentation/components/shadcn/aspect-ratio"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { SILVER_925_COLLECTION_HANDLE } from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

import { ROUTES } from "~/src/routes"

export const SilverPremiumSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.silverPremiumSection")
  const silverCollectionParams = useMemo(() => ({ handle: SILVER_925_COLLECTION_HANDLE }), [])

  return (
    <section id="srebro" className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-400 gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12 lg:py-32">
        <div className="reveal space-y-10 lg:space-y-12">
          <div className="space-y-6">
            <p className="text-[10px] tracking-[0.28em] text-primary-foreground/40 uppercase">{t("eyebrow")}</p>
            <h2 className="font-serif text-6xl leading-[0.9] tracking-tight md:text-7xl lg:text-8xl">
              {t("titleMain")} <span className="italic">{t("titleAccent")}</span>
            </h2>
            <p className="max-w-md text-base/[1.7] text-primary-foreground/55 lg:text-lg/[1.7]">{t("description")}</p>
          </div>

          <div className="flex items-center gap-4">
            <LocalizedLink
              params={silverCollectionParams}
              to={ROUTES.COLLECTION}
              className="inline-flex h-12 items-center justify-center bg-primary-foreground px-8 text-[11px] tracking-[0.2em] text-primary uppercase transition-colors hover:bg-primary-foreground/90"
            >
              {t("ctaPrimary")}
            </LocalizedLink>
            <LocalizedLink
              to={ROUTES.PRODUCTS}
              className="inline-flex h-12 items-center justify-center border border-primary-foreground/25 px-8 text-[11px] tracking-[0.2em] text-primary-foreground uppercase transition-colors hover:border-primary-foreground/60 hover:bg-primary-foreground/5"
            >
              {t("ctaSecondary")}
            </LocalizedLink>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t border-primary-foreground/10 pt-8 sm:grid-cols-3 sm:gap-8 lg:gap-12 lg:pt-10">
            <div>
              <p className="font-serif text-4xl leading-none tracking-tight lg:text-5xl">{t("stats.purity.value")}</p>
              <p className="mt-2.5 text-[10px] tracking-[0.2em] text-primary-foreground/35 uppercase">{t("stats.purity.label")}</p>
            </div>
            <div>
              <p className="font-serif text-4xl leading-none tracking-tight lg:text-5xl">{t("stats.handmade.value")}</p>
              <p className="mt-2.5 text-[10px] tracking-[0.2em] text-primary-foreground/35 uppercase">{t("stats.handmade.label")}</p>
            </div>
            <div>
              <p className="font-serif text-4xl leading-none tracking-tight lg:text-5xl">{t("stats.warranty.value")}</p>
              <p className="mt-2.5 text-[10px] tracking-[0.2em] text-primary-foreground/35 uppercase">{t("stats.warranty.label")}</p>
            </div>
          </div>
        </div>

        <div className="reveal relative">
          <AspectRatio className="parallax-wrap overflow-hidden bg-primary-foreground/5" ratio={ASPECT_RATIO_TALL}>
            <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
              <Image
                alt={t("imageAlt")}
                className="absolute inset-0 size-full object-cover object-[center_80%]"
                height={1400}
                sizes="(max-width: 1024px) 100vw, 50vw"
                src={getAssetURL("marketing/silver925_premium.webp")}
                width={1120}
              />
            </div>
          </AspectRatio>
        </div>
      </div>
    </section>
  )
}

const ASPECT_RATIO_TALL = 0.9
