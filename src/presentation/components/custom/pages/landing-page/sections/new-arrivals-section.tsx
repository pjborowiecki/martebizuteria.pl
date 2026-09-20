import { type JSX, Suspense } from "react"

import { useTranslations } from "use-intl"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  NewArrivalsProductGrid,
  NewArrivalsProductGridSkeleton,
} from "~/src/presentation/components/custom/pages/landing-page/sections/new-arrivals-product-grid"

import { ROUTES } from "~/src/routes"
export const NewArrivalsSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.newArrivalsSection")
  return (
    <section id="nowosci" className="mx-auto max-w-400 space-y-10 px-6 pt-20 pb-20 lg:px-12 lg:pt-28 lg:pb-28">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
        </div>
        <LocalizedLink
          to={ROUTES.PRODUCTS}
          className="inline-flex h-13 items-center justify-center rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("cta")}
        </LocalizedLink>
      </div>

      <Suspense fallback={NEW_ARRIVALS_GRID_SUSPENSE_FALLBACK}>
        <NewArrivalsProductGrid />
      </Suspense>
    </section>
  )
}
const NEW_ARRIVALS_GRID_SUSPENSE_FALLBACK = <NewArrivalsProductGridSkeleton />
