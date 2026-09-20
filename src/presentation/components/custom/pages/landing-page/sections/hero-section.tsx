import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { LANDING_HERO_IMG } from "~/src/data/landing-data"

import { AspectRatio } from "~/src/presentation/components/shadcn/aspect-ratio"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"
const HeroTitle = (): JSX.Element => {
  const t = useTranslations("pages.landing.heroSection")
  return (
    <h1 className="font-serif text-5xl leading-[0.94] tracking-tight md:text-6xl lg:text-7xl">
      {t("titleLine1")}
      <br />
      <span className="italic">{t("titleLine2")}</span>
    </h1>
  )
}
export const HeroSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.heroSection")
  return (
    <section className="mx-auto max-w-400 px-6 pt-10 pb-16 lg:px-12 lg:pt-14 lg:pb-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="flex flex-col justify-end gap-8">
          <div className="space-y-8">
            <Badge className="rounded-none px-0 font-medium tracking-[0.28em] uppercase" variant="outline">
              {t("eyebrow")}
            </Badge>

            <div className="space-y-5">
              <HeroTitle />
              <p className="max-w-lg text-sm/relaxed font-light text-muted-foreground md:text-base/relaxed">{t("description")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <LocalizedLink
                to={ROUTES.PRODUCTS}
                className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("ctaPrimary")}
              </LocalizedLink>
              <LocalizedLink
                to={ROUTES.ABOUT}
                className="inline-flex h-13 items-center justify-center border border-foreground/20 px-8 text-[11px] tracking-[0.2em] uppercase transition-colors hover:border-foreground/50"
              >
                {t("ctaSecondary")}
              </LocalizedLink>
            </div>

            <div className="pt-3">
              <Separator className="max-w-52 bg-foreground/35" />
              <p className="pt-3 text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("scrollHint")}</p>
            </div>
          </div>
        </div>

        <AspectRatio className="parallax-wrap overflow-hidden bg-card" ratio={ASPECT_RATIO_TALL}>
          <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
            <Image
              alt={t("imageAlt")}
              className="absolute inset-0 size-full object-cover"
              height={2160}
              priority
              sizes="(max-width: 1024px) 100vw, 56vw"
              src={LANDING_HERO_IMG}
              width={1800}
            />
          </div>
        </AspectRatio>
      </div>
    </section>
  )
}
const ASPECT_RATIO_TALL = 0.833333
