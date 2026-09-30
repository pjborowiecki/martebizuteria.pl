import { type JSX, type ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { AuthDivider } from "~/src/presentation/components/custom/pages/auth/auth-divider"
import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"
import { SignUpWithPasswordForm } from "~/src/presentation/components/custom/pages/auth/sign-up-with-password-form"
import { SocialProviders } from "~/src/presentation/components/custom/pages/auth/social-providers"

import type signUpMessages from "~/messages/en-US/pages.auth.sign-up.json"
import { ROUTES } from "~/src/routes"

const renderTermsChunk = (chunks: ReactNode): JSX.Element => (
  <LocalizedLink to={ROUTES.TERMS_OF_SERVICE} className={LEGAL_LINK_CLASS}>
    {chunks}
  </LocalizedLink>
)

const renderPrivacyChunk = (chunks: ReactNode): JSX.Element => (
  <LocalizedLink to={ROUTES.PRIVACY_POLICY} className={LEGAL_LINK_CLASS}>
    {chunks}
  </LocalizedLink>
)

const SignUpPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.sign-up")

  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="space-y-6">
        <SignUpWithPasswordForm />
        <AuthDivider />
        <SocialProviders />

        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p>
            {t.rich("terms", {
              privacy: renderPrivacyChunk,
              terms: renderTermsChunk,
            })}
          </p>
          <p>
            {t("hasAccount")}{" "}
            <LocalizedLink to={ROUTES.AUTH_SIGN_IN} className={LEGAL_LINK_CLASS}>
              {t("signInInstead")}
            </LocalizedLink>
          </p>
        </div>
      </div>
    </>
  )
}

const LEGAL_LINK_CLASS = "text-foreground underline underline-offset-4 transition-colors hover:text-foreground/60"

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof signUpMessages>({ locale, namespace: "pages.auth.sign-up" }),
    )

    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.auth.sign-up"],
  },
})
