import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"
import { ForgotPasswordForm } from "~/src/presentation/components/custom/pages/auth/forgot-password-form"

import type forgotPasswordMessages from "~/messages/en-US/pages.auth.forgot-password.json"
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

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context

    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof forgotPasswordMessages>({ locale, namespace: "pages.auth.forgot-password" }),
    )

    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.auth.forgot-password"],
  },
})
