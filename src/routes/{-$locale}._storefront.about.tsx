import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"
const AboutPage = (): JSX.Element => {
  const t = useTranslations("pages.about")
  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6 p-4">
      <h1 className="text-4xl font-bold tracking-tight">{t("about")}</h1>

      <div className="max-w-prose text-center text-muted-foreground">
        <p>{t("description")}</p>
      </div>

      <LocalizedLink to={ROUTES.HOME} className="text-primary underline-offset-4 hover:underline">
        {t("goHome")}
      </LocalizedLink>
    </main>
  )
}
interface AboutPageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/_storefront/about")({
  component: AboutPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<AboutPageMeta> | undefined
  }>) => ({
    meta: [
      {
        title: loaderData?.title ?? APP_NAME,
      },
      {
        content: loaderData?.description ?? "",
        name: "description",
      },
      {
        content: loaderData?.title ?? APP_NAME,
        property: "og:title",
      },
      {
        content: loaderData?.description ?? "",
        property: "og:description",
      },
    ],
  }),
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.about"))
    return {
      description: messages.description,
      title: messages.about,
    } satisfies AboutPageMeta
  },
  staticData: {
    namespaces: ["pages.about"],
  },
})
