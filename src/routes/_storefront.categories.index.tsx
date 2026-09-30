import { type JSX, useRef } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { getCategoriesQuery } from "~/src/modules/product-category/use-cases/get-categories"

import { useLandingAnimations } from "~/src/hooks/use-landing-animations"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { CategoriesIndexGrid } from "~/src/presentation/components/custom/pages/categories/categories-index-grid"

import type categoriesMessages from "~/messages/en-US/pages.categories.json"

const CategoriesPage = (): JSX.Element => {
  const t = useTranslations("pages.categories")
  const rootRef = useRef<HTMLDivElement>(null)
  const { data: categories } = useSuspenseQuery(getCategoriesQuery())
  useLandingAnimations({
    rootRef,
  })

  const [firstCategory] = categories

  return (
    <main ref={rootRef} className="bg-background text-foreground">
      <div className="mx-auto max-w-400 px-6 pt-10 pb-24 lg:px-12 lg:pt-14 lg:pb-36">
        <header className="reveal mb-14 space-y-4 lg:mb-18">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h1 className="font-serif text-4xl leading-[0.94] tracking-tight md:text-5xl lg:text-7xl">{t("title")}</h1>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
        </header>

        {firstCategory === undefined ? (
          <p className="reveal text-sm text-muted-foreground">{t("noCategoriesFound")}</p>
        ) : (
          <CategoriesIndexGrid categories={categories} />
        )}
      </div>
    </main>
  )
}

export const Route = createFileRoute("/_storefront/categories/")({
  component: CategoriesPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    await context.queryClient.query({
      ...getCategoriesQuery(),
      staleTime: "static",
    })

    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof categoriesMessages>({ locale, namespace: "pages.categories" }),
    )

    return {
      description: messages.metaDescription,
      title: messages.metaTitle,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.categories"],
  },
})
