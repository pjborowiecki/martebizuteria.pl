import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useLocale, useTranslations } from "use-intl/react"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { getContentPageQuery } from "~/src/modules/content-page/use-cases/get-content-page"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { ABOUT_PROSE_CLASS } from "~/src/presentation/components/custom/pages/content-page/_styles/content-page.styles"
import { ContentPageMarkdown } from "~/src/presentation/components/custom/pages/content-page/content-page-markdown"
import { SellerContactDetails } from "~/src/presentation/components/custom/seller-contact-details"

import { ABOUT_CONTACT_HASH } from "~/src/routes"

const AboutPage = (): JSX.Element => {
  const t = useTranslations("pages.about")
  const locale = useLocale()
  const { data: page } = useSuspenseQuery(getContentPageQuery(CONTENT_PAGE_HANDLE.ABOUT, locale))

  return (
    <main className="storefront-container pt-8 pb-24 lg:pt-10 lg:pb-32">
      <header className="mb-8 max-w-2xl space-y-3 lg:mb-10">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl lg:text-6xl">{page.title}</h1>
        <p className="text-base/relaxed text-foreground md:text-lg/relaxed">{page.description}</p>
      </header>

      <div className={`max-w-2xl ${ABOUT_PROSE_CLASS}`}>
        <ContentPageMarkdown body={page.body} />
      </div>

      <section
        id={ABOUT_CONTACT_HASH}
        aria-labelledby="about-contact-heading"
        className="mt-16 max-w-2xl scroll-mt-24 space-y-6 border-t border-border pt-10 lg:mt-20"
      >
        <h2 id="about-contact-heading" className="font-serif text-3xl tracking-tight md:text-4xl">
          {t("contactTitle")}
        </h2>
        <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("contactDescription")}</p>
        <SellerContactDetails className="text-base/relaxed text-foreground sm:grid-cols-2" />
      </section>
    </main>
  )
}

export const Route = createFileRoute("/_storefront/about")({
  component: AboutPage,
  head: pageHead,
  loader: async ({ context }) => {
    const page = await context.queryClient.query(getContentPageQuery(CONTENT_PAGE_HANDLE.ABOUT, context.locale))

    return { description: page.description, title: page.title } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.about"],
  },
})
