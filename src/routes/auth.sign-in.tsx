import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import zod from "zod/v4"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { AuthDivider } from "~/src/presentation/components/custom/pages/auth/auth-divider"
import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"
import { SignInWithPasswordForm } from "~/src/presentation/components/custom/pages/auth/sign-in-with-password-form"
import { SocialProviders } from "~/src/presentation/components/custom/pages/auth/social-providers"

import type signInMessages from "~/messages/en-US/pages.auth.sign-in.json"
import { ROUTES } from "~/src/routes"

const SignInPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.sign-in")

  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="space-y-6">
        <SignInWithPasswordForm />
        <AuthDivider />
        <SocialProviders />

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <LocalizedLink
            to={ROUTES.AUTH_SIGN_UP}
            className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/60"
          >
            {t("createAccount")}
          </LocalizedLink>
        </p>
      </div>
    </>
  )
}

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof signInMessages>({ locale, namespace: "pages.auth.sign-in" }),
    )

    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.auth.sign-in"],
  },
  validateSearch: zod.object({ redirect: zod.string().optional() }),
})
