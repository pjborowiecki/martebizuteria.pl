import { useMemo, type JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { LocalizedLink } from "~/src/components/custom/localized-link";

import { BLOG_POST_SLUG_LIST } from "~/src/data/blog-posts";

interface BlogIndexPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/_storefront/blog/")({
  component: BlogIndexPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<BlogIndexPageMeta> }>) => ({
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
      description: messages?.pages.blog.index.description ?? "",
      title: messages?.pages.blog.index.title ?? CONSTANTS.APP_NAME
    } satisfies BlogIndexPageMeta;
  }
});

function BlogPostLink({ slug }: Readonly<{ slug: (typeof BLOG_POST_SLUG_LIST)[number] }>): JSX.Element {
  const t = useTranslations("pages.blog");
  const tPosts = useTranslations("pages.blog.posts");
  const params = useMemo(() => ({ slug }), [slug]);

  return (
    <li>
      <LocalizedLink
        className="group flex items-center justify-between gap-6 border-b border-border py-5 text-lg transition-colors hover:text-muted-foreground"
        params={params}
        to={CONSTANTS.ROUTES.BLOG_POST}
      >
        <span>{tPosts(`${slug}.title`)}</span>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          {t("index.readArticle")}
          <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
        </span>
      </LocalizedLink>
    </li>
  );
}

function BlogIndexPage(): JSX.Element {
  const t = useTranslations("pages.blog.index");

  return (
    <main className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">M&apos;ARTE</p>
      <h1 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">{t("title")}</h1>
      <p className="mt-5 max-w-2xl text-base/relaxed text-muted-foreground">{t("description")}</p>

      <ul className="mt-12 border-t border-border">
        {BLOG_POST_SLUG_LIST.map((slug) => (
          <BlogPostLink key={slug} slug={slug} />
        ))}
      </ul>
    </main>
  );
}
