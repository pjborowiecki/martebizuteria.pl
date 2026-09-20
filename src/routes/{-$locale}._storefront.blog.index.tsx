import { type JSX, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { BLOG_POST_SLUG_LIST } from "~/src/data/blog-posts"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"
const BlogPostLink = ({
  slug,
}: Readonly<{
  slug: (typeof BLOG_POST_SLUG_LIST)[number]
}>): JSX.Element => {
  const t = useTranslations("pages.blog")
  const tPosts = useTranslations("pages.blog.posts")
  const params = useMemo(
    () => ({
      slug,
    }),
    [slug],
  )
  return (
    <li>
      <LocalizedLink
        className="group flex items-center justify-between gap-6 border-b border-border py-5 text-lg transition-colors hover:text-muted-foreground"
        params={params}
        to={ROUTES.BLOG_POST}
      >
        <span>{tPosts(`${slug}.title`)}</span>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          {t("index.readArticle")}
          <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
        </span>
      </LocalizedLink>
    </li>
  )
}
const BlogIndexPage = (): JSX.Element => {
  const t = useTranslations("pages.blog.index")
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
  )
}
interface BlogIndexPageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/_storefront/blog/")({
  component: BlogIndexPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<BlogIndexPageMeta> | undefined
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
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.blog"))
    return {
      description: messages.index.description,
      title: messages.index.title,
    } satisfies BlogIndexPageMeta
  },
  staticData: {
    namespaces: ["pages.blog"],
  },
})
