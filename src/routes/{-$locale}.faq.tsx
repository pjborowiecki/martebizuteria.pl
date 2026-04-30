import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";

interface FaqPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/faq")({
  component: FaqPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<FaqPageMeta> }>) => ({
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
      description: messages?.faqPage.description ?? "",
      title: messages?.faqPage.title ?? CONSTANTS.APP_NAME
    } satisfies FaqPageMeta;
  }
});

function FaqPage(): JSX.Element {
  const t = useTranslations("faqPage");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6 p-4">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>

      <div className="max-w-prose text-center text-muted-foreground">
        <p>{t("description")}</p>
      </div>

      <LocalizedLink className="text-primary underline-offset-4 hover:underline" to="/">
        {t("goHome")}
      </LocalizedLink>
    </main>
  );
}
