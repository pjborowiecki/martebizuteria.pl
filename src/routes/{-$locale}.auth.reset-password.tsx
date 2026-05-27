import { type JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { z } from "zod";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { AuthHeader } from "~/src/components/custom/pages/auth/auth-header";
import { ResetPasswordForm } from "~/src/components/custom/pages/auth/reset-password-form";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional()
});

interface ResetPasswordPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/auth/reset-password")({
  component: ResetPasswordPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<ResetPasswordPageMeta> }>) => ({
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
      description: messages?.auth.resetPasswordPage.meta.description ?? "",
      title: messages?.auth.resetPasswordPage.meta.title ?? CONSTANTS.APP_NAME
    } satisfies ResetPasswordPageMeta;
  },
  validateSearch: resetPasswordSearchSchema
});

function ResetPasswordPage(): JSX.Element {
  const t = useTranslations("auth.resetPasswordPage");
  const { token } = Route.useSearch();

  if (token === undefined || token === "") {
    return <div className="mt-8 text-center text-muted-foreground">{t("invalidToken")}</div>;
  }

  return (
    <>
      <AuthHeader title={t("title")} subtitle={t("subtitle")} />
      <ResetPasswordForm token={token} />
    </>
  );
}
