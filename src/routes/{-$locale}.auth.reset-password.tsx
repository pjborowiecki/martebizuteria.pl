import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"
import { z } from "zod"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding/app"

import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"
import { ResetPasswordForm } from "~/src/presentation/components/custom/pages/auth/reset-password-form"
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
interface ResetPasswordPageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/auth/reset-password")({
  component: ResetPasswordPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<ResetPasswordPageMeta> | undefined
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
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.auth.reset-password"))
    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies ResetPasswordPageMeta
  },
  staticData: {
    namespaces: ["pages.auth.reset-password"],
  },
  validateSearch: resetPasswordSearchSchema,
})
