import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl"

import { categoriesQueryOptions } from "~/src/modules/product-category/use-cases/get-categories"

import { AspectRatio } from "~/src/presentation/components/shadcn/aspect-ratio"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import {
  type LandingCategoryPanel,
  resolveLandingCategoryPanelCopy,
} from "~/src/presentation/components/custom/pages/landing-page/sections/landing-category-panel.utils"

import { ROUTES } from "~/src/routes"
const MobileCategoryPanel = ({
  category,
  index,
}: Readonly<{
  category: LandingCategoryPanel
  index: number
}>): JSX.Element => {
  const locale = useLocale()
  const t = useTranslations("pages.landing.categoriesSection")
  const panel = resolveLandingCategoryPanelCopy(category, locale)
  const params = useMemo(() => ({ handle: panel.handle }), [panel.handle])
  return (
    <article className="reveal overflow-hidden border border-border/60 bg-background">
      <AspectRatio className="w-full overflow-hidden bg-muted" ratio={ASPECT_RATIO_LANDSCAPE}>
        <Image
          alt={panel.title}
          className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
          height={1000}
          priority={index === 0}
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
          to={ROUTES.CATEGORY}
        >
          {t("discoverCategory", { category: panel.tag })}
        </LocalizedLink>
      </div>
    </article>
  )
}
export const MobileCategoriesSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.categoriesSection")
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions())
  return (
    <section className="mx-auto max-w-400 space-y-8 px-6 pb-8 lg:hidden lg:px-12">
      <div className="reveal">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-6">
        {categories.map((category, index) => (
          <MobileCategoryPanel key={category.id} category={category} index={index} />
        ))}
      </div>
    </section>
  )
}
const ASPECT_RATIO_LANDSCAPE = 1.25
