import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getCategoriesQuery } from "~/src/modules/product-category/use-cases/get-categories"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { StorefrontCategoryCard } from "~/src/presentation/components/custom/pages/categories/category-card"

import { ROUTES } from "~/src/routes"

export const ShopCategoriesSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.shopCategoriesSection")
  const { data: categories } = useSuspenseQuery(getCategoriesQuery())
  const [cat1, cat2, cat3, cat4, cat5] = categories.slice(0, SHOP_CATEGORY_DISPLAY_LIMIT)

  return (
    <section className="mx-auto max-w-400 px-6 pb-24 lg:px-12 lg:pb-36">
      <div className="reveal mb-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-18">
        <div className="space-y-4">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-5xl leading-[0.94] tracking-tight md:text-6xl lg:text-7xl">{t("title")}</h2>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
        </div>
        <LocalizedLink
          to={ROUTES.CATEGORIES}
          className="inline-flex h-12 shrink-0 items-center justify-center border border-foreground/20 px-8 text-[11px] tracking-[0.2em] uppercase transition-colors hover:border-foreground/50 sm:self-end"
        >
          {t("cta")}
        </LocalizedLink>
      </div>

      <div className="reveal grid gap-5 lg:grid-cols-[8fr_5fr] lg:gap-6">
        {cat1 !== undefined && (
          <StorefrontCategoryCard aspectRatioClass="lg:aspect-8/5" category={cat1} priority sizes="(max-width: 1024px) 100vw, 62vw" />
        )}
        {cat2 !== undefined && (
          <StorefrontCategoryCard aspectRatioClass="lg:aspect-square" category={cat2} sizes="(max-width: 1024px) 100vw, 38vw" />
        )}
      </div>

      <div className="reveal mt-10 grid grid-cols-2 gap-5 lg:mt-14 lg:grid-cols-[5fr_8fr] lg:gap-6">
        {cat3 !== undefined && (
          <StorefrontCategoryCard aspectRatioClass="lg:aspect-square" category={cat3} sizes="(max-width: 1024px) 50vw, 38vw" />
        )}
        {cat4 !== undefined && (
          <StorefrontCategoryCard aspectRatioClass="lg:aspect-8/5" category={cat4} sizes="(max-width: 1024px) 50vw, 62vw" />
        )}
      </div>

      <div className="reveal mt-10 grid gap-5 lg:mt-14 lg:grid-cols-[8fr_5fr] lg:gap-6">
        {cat5 !== undefined && (
          <StorefrontCategoryCard aspectRatioClass="lg:aspect-8/5" category={cat5} sizes="(max-width: 1024px) 100vw, 62vw" />
        )}
        <div className="hidden lg:block" />
      </div>
    </section>
  )
}

const SHOP_CATEGORY_DISPLAY_LIMIT = 5
