import { type JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { AuthDivider } from "~/src/components/custom/pages/auth/auth-divider";
import { AuthHeader } from "~/src/components/custom/pages/auth/auth-header";
import { SignInWithPasswordForm } from "~/src/components/custom/pages/auth/sign-in-with-password-form";
import { SocialProviders } from "~/src/components/custom/pages/auth/social-providers";

interface SignInPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/auth/sign-in")({
  component: SignInPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<SignInPageMeta> }>) => ({
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
      description: messages?.auth.signInPage.meta.description ?? "",
      title: messages?.auth.signInPage.meta.title ?? CONSTANTS.APP_NAME
    } satisfies SignInPageMeta;
  }
});

function SignInPage(): JSX.Element {
  const t = useTranslations("auth.signInPage");

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
            to={CONSTANTS.ROUTES.AUTH_SIGN_UP}
            className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/60"
          >
            {t("createAccount")}
          </LocalizedLink>
        </p>
      </div>
    </>
  );
}
