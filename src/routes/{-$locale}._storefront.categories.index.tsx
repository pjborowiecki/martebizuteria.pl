import { type JSX, useRef } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { CategoriesIndexGrid } from "~/src/components/custom/pages/categories/categories-index-grid";

import { useLandingAnimations } from "~/src/hooks/use-landing-animations";
import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";

interface CategoriesPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/_storefront/categories/")({
  component: CategoriesPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<CategoriesPageMeta> }>) => ({
    meta: [
      { title: loaderData?.title ?? CONSTANTS.APP_NAME },
      { content: loaderData?.description ?? "", name: "description" },
      { content: loaderData?.title ?? CONSTANTS.APP_NAME, property: "og:title" },
      { content: loaderData?.description ?? "", property: "og:description" }
    ]
  }),
  loader: async ({ context, params }) => {
    const { locale: rawLocale } = params;
    let locale: Locale = CONSTANTS.DEFAULT_LOCALE;

    if (typeof rawLocale === "string" && isValidLocale(rawLocale)) {
      locale = rawLocale;
    }

    await context.queryClient.ensureQueryData(categoryQueryOptions.categoriesQueryOptions());
    const messages = context.queryClient.getQueryData<Messages>(messagesQueryOptions(locale).queryKey);

    return {
      description: messages?.pages.categories.metaDescription ?? "",
      title: messages?.pages.categories.metaTitle ?? CONSTANTS.APP_NAME
    } satisfies CategoriesPageMeta;
  }
});

function CategoriesPage(): JSX.Element {
  const t = useTranslations("pages.categories");
  const rootRef = useRef<HTMLDivElement>(null);
  const { data: categories } = useSuspenseQuery(categoryQueryOptions.categoriesQueryOptions());

  useLandingAnimations({ rootRef });

  const [firstCategory] = categories;

  return (
    <main ref={rootRef} className="bg-background text-foreground">
      <div className="mx-auto max-w-400 px-6 pt-10 pb-24 lg:px-12 lg:pt-14 lg:pb-36">
        <header className="reveal mb-14 space-y-4 lg:mb-18">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h1 className="font-serif text-4xl leading-[0.94] tracking-tight md:text-5xl lg:text-7xl">{t("title")}</h1>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
        </header>

        {firstCategory === undefined ? (
          <p className="reveal text-sm text-muted-foreground">{t("noCategoriesFound")}</p>
        ) : (
          <CategoriesIndexGrid categories={categories} />
        )}
      </div>
    </main>
  );
}
