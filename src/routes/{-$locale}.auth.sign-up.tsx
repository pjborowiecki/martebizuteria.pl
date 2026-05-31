import { type JSX, type ReactNode } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { AuthDivider } from "~/src/components/custom/pages/auth/auth-divider";
import { AuthHeader } from "~/src/components/custom/pages/auth/auth-header";
import { SignUpWithPasswordForm } from "~/src/components/custom/pages/auth/sign-up-with-password-form";
import { SocialProviders } from "~/src/components/custom/pages/auth/social-providers";

interface SignUpPageMeta {
  readonly description: string;
  readonly title: string;
}

const LEGAL_LINK_CLASS = "text-foreground underline underline-offset-4 transition-colors hover:text-foreground/60";

function renderTermsChunk(chunks: ReactNode): JSX.Element {
  return (
    <LocalizedLink to={CONSTANTS.ROUTES.TERMS_OF_SERVICE} className={LEGAL_LINK_CLASS}>
      {chunks}
    </LocalizedLink>
  );
}

function renderPrivacyChunk(chunks: ReactNode): JSX.Element {
  return (
    <LocalizedLink to={CONSTANTS.ROUTES.PRIVACY_POLICY} className={LEGAL_LINK_CLASS}>
      {chunks}
    </LocalizedLink>
  );
}

export const Route = createFileRoute("/{-$locale}/auth/sign-up")({
  component: SignUpPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<SignUpPageMeta> }>) => ({
    meta: [
      { title: loaderData?.title ?? CONSTANTS.APP_NAME },
      { content: loaderData?.description ?? "", name: "description" },
      { content: loaderData?.title ?? CONSTANTS.APP_NAME, property: "og:title" },
      { content: loaderData?.description ?? "", property: "og:description" }
    ]
  }),
  loader: ({ context, params }) => {
    const { locale: rawLocale } = params;
    let locale: Locale = CONSTANTS.DEFAULT_LOCALE;

    if (typeof rawLocale === "string" && isValidLocale(rawLocale)) {
      locale = rawLocale;
    }

    const messages = context.queryClient.getQueryData<Messages>(messagesQueryOptions(locale).queryKey);

    return {
      description: messages?.auth.signUpPage.meta.description ?? "",
      title: messages?.auth.signUpPage.meta.title ?? CONSTANTS.APP_NAME
    } satisfies SignUpPageMeta;
  }
});

function SignUpPage(): JSX.Element {
  const t = useTranslations("auth.signUpPage");

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
              terms: renderTermsChunk
            })}
          </p>
          <p>
            {t("hasAccount")}{" "}
            <LocalizedLink to={CONSTANTS.ROUTES.AUTH_SIGN_IN} className={LEGAL_LINK_CLASS}>
              {t("signInInstead")}
            </LocalizedLink>
          </p>
        </div>
      </div>
    </>
  );
}
