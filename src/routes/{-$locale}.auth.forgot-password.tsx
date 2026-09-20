import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"
import { ForgotPasswordForm } from "~/src/presentation/components/custom/pages/auth/forgot-password-form"

import { ROUTES } from "~/src/routes"
const ForgotPasswordPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.forgot-password")
  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <LocalizedLink
          to={ROUTES.AUTH_SIGN_IN}
          className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/60"
        >
          {t("backToSignIn")}
        </LocalizedLink>
      </p>
    </>
  )
}
interface ForgotPasswordPageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/auth/forgot-password")({
  component: ForgotPasswordPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<ForgotPasswordPageMeta> | undefined
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
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.auth.forgot-password"))
    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies ForgotPasswordPageMeta
  },
  staticData: {
    namespaces: ["pages.auth.forgot-password"],
  },
})
