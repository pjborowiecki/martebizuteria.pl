import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import type aboutMessages from "~/messages/en-US/pages.about.json"

const AboutPage = (): JSX.Element => {
  const t = useTranslations("pages.about")

  return (
    <main className="mx-auto max-w-400 px-6 pt-8 pb-24 lg:px-12 lg:pt-10 lg:pb-32">
      <header className="mb-8 max-w-2xl space-y-3 lg:mb-10">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl lg:text-6xl">{t("about")}</h1>
        <p className="text-base/relaxed text-foreground md:text-lg/relaxed">{t("description")}</p>
      </header>

      <div className="max-w-2xl space-y-6">
        <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("paragraph1")}</p>
        <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("paragraph2")}</p>
        <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("paragraph3")}</p>
        <p className="text-base/relaxed text-foreground md:text-lg/relaxed">{t("paragraph4")}</p>
      </div>
    </main>
  )
}

export const Route = createFileRoute("/_storefront/about")({
  component: AboutPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions<typeof aboutMessages>({ locale, namespace: "pages.about" }))

    return {
      description: messages.description,
      title: messages.about,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.about"],
  },
})
