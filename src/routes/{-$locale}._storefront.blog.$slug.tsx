import type { JSX } from "react";

import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";

import { type BlogPostSlug, isBlogPostSlug } from "~/src/data/blog-posts";

interface BlogPostPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/_storefront/blog/$slug")({
  component: BlogPostPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<BlogPostPageMeta> }>) => ({
    meta: [
      { title: loaderData?.title ?? CONSTANTS.APP_NAME },
      { content: loaderData?.description ?? "", name: "description" },
      { content: loaderData?.title ?? CONSTANTS.APP_NAME, property: "og:title" },
      { content: loaderData?.description ?? "", property: "og:description" }
    ]
  }),
  loader: ({ context, params }) => {
    const { slug: rawSlug, locale: rawLocale } = params;

    if (!isBlogPostSlug(rawSlug)) {
      notFound({ throw: true });
      return { description: "", title: CONSTANTS.APP_NAME } satisfies BlogPostPageMeta;
    }

    const slug: BlogPostSlug = rawSlug;
    let locale: Locale = CONSTANTS.DEFAULT_LOCALE;

    if (typeof rawLocale === "string" && isValidLocale(rawLocale)) {
      locale = rawLocale;
    }

    const messages = context.queryClient.getQueryData<Messages>(messagesQueryOptions(locale).queryKey);
    const post = messages?.pages.blog.posts[slug];

    return {
      description: post?.description ?? "",
      title: post?.title ?? CONSTANTS.APP_NAME
    } satisfies BlogPostPageMeta;
  }
});

function BlogPostPage(): JSX.Element {
  const { slug } = Route.useParams();
  const t = useTranslations("pages.blog.post");
  const tPosts = useTranslations("pages.blog.posts");

  if (!isBlogPostSlug(slug)) {
    return <main />;
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">M&apos;ARTE</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{tPosts(`${slug}.title`)}</h1>
      <p className="mt-6 text-base/relaxed text-muted-foreground">{tPosts(`${slug}.description`)}</p>
      <p className="mt-10 rounded-none border border-border bg-muted/30 px-6 py-5 text-sm/relaxed text-muted-foreground">
        {t("placeholder")}
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-6 text-sm">
        <LocalizedLink className="underline-offset-4 hover:underline" to={CONSTANTS.ROUTES.BLOG}>
          {t("backToGuide")}
        </LocalizedLink>
        <LocalizedLink
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          to={CONSTANTS.ROUTES.HOME}
        >
          {t("goHome")}
        </LocalizedLink>
      </div>
    </main>
  );
}
