import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import type termsMessages from "~/messages/en-US/pages.terms-of-service.json"
import { ROUTES } from "~/src/routes"

const TermsOfServicePage = (): JSX.Element => {
  const t = useTranslations("pages.terms-of-service")

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 p-4">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>

      <div className="max-w-prose text-center text-muted-foreground">
        <p>{t("description")}</p>
      </div>

      <LocalizedLink to={ROUTES.HOME} className="text-primary underline-offset-4 hover:underline">
        {t("goHome")}
      </LocalizedLink>
    </main>
  )
}

export const Route = createFileRoute("/_storefront/terms-of-service")({
  component: TermsOfServicePage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof termsMessages>({ locale, namespace: "pages.terms-of-service" }),
    )

    return {
      description: messages.description,
      title: messages.title,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.terms-of-service"],
  },
})
