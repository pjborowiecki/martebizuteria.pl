import { type JSX, type ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { AuthDivider } from "~/src/presentation/components/custom/pages/auth/auth-divider"
import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"
import { SignUpWithPasswordForm } from "~/src/presentation/components/custom/pages/auth/sign-up-with-password-form"
import { SocialProviders } from "~/src/presentation/components/custom/pages/auth/social-providers"

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
interface SignUpPageMeta {
  readonly description: string
  readonly title: string
}
const LEGAL_LINK_CLASS = "text-foreground underline underline-offset-4 transition-colors hover:text-foreground/60"
export const Route = createFileRoute("/{-$locale}/auth/sign-up")({
  component: SignUpPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<SignUpPageMeta> | undefined
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
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.auth.sign-up"))
    return {
      description: messages.meta.description,
      title: messages.meta.title,
    } satisfies SignUpPageMeta
  },
  staticData: {
    namespaces: ["pages.auth.sign-up"],
  },
})
