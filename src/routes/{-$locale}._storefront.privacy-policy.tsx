import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"
const PrivacyPolicyPage = (): JSX.Element => {
  const t = useTranslations("pages.privacyPolicy")
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
interface PrivacyPolicyPageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/_storefront/privacy-policy")({
  component: PrivacyPolicyPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<PrivacyPolicyPageMeta> | undefined
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
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.privacyPolicy"))
    return {
      description: messages.description,
      title: messages.title,
    } satisfies PrivacyPolicyPageMeta
  },
  staticData: {
    namespaces: ["pages.privacyPolicy"],
  },
})
