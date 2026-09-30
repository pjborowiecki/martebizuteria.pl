import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import { z } from "zod"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"
import { ResetPasswordForm } from "~/src/presentation/components/custom/pages/auth/reset-password-form"

import type resetPasswordMessages from "~/messages/en-US/pages.auth.reset-password.json"

const ResetPasswordPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.reset-password")
  const { token } = Route.useSearch()
  if (token === undefined || token === "") {
    return <div className="mt-8 text-center text-muted-foreground">{t("invalidToken")}</div>
  }

  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      <ResetPasswordForm token={token} />
    </>
  )
}

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof resetPasswordMessages>({ locale, namespace: "pages.auth.reset-password" }),
    )

    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.auth.reset-password"],
  },
  validateSearch: resetPasswordSearchSchema,
})
