import { type JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { AuthHeader } from "~/src/components/custom/pages/auth/auth-header";
import { ForgotPasswordForm } from "~/src/components/custom/pages/auth/forgot-password-form";

interface ForgotPasswordPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/auth/forgot-password")({
  component: ForgotPasswordPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<ForgotPasswordPageMeta> }>) => ({
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
      description: messages?.pages.auth["forgot-password"].meta.description ?? "",
      title: messages?.pages.auth["forgot-password"].meta.title ?? CONSTANTS.APP_NAME
    } satisfies ForgotPasswordPageMeta;
  }
});

function ForgotPasswordPage(): JSX.Element {
  const t = useTranslations("pages.auth.forgot-password");

  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <LocalizedLink
          to={CONSTANTS.ROUTES.AUTH_SIGN_IN}
          className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/60"
        >
          {t("backToSignIn")}
        </LocalizedLink>
      </p>
    </>
  );
}
