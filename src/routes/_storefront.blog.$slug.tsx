import { type JSX } from "react"

import { createFileRoute, notFound } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type BlogPostSlug, isBlogPostSlug } from "~/src/data/blog-posts"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import type blogMessages from "~/messages/en-US/pages.blog.json"
import { ROUTES } from "~/src/routes"

const BlogPostPage = (): JSX.Element => {
  const { slug } = Route.useParams()
  const t = useTranslations("pages.blog.post")
  const tPosts = useTranslations("pages.blog.posts")
  if (!isBlogPostSlug(slug)) {
    return <main />
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
        <LocalizedLink className="underline-offset-4 hover:underline" to={ROUTES.BLOG}>
          {t("backToGuide")}
        </LocalizedLink>
        <LocalizedLink className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" to={ROUTES.HOME}>
          {t("goHome")}
        </LocalizedLink>
      </div>
    </main>
  )
}

export const Route = createFileRoute("/_storefront/blog/$slug")({
  component: BlogPostPage,
  head: pageHead,
  loader: async ({ context, params }) => {
    const { slug: rawSlug } = params
    if (!isBlogPostSlug(rawSlug)) {
      notFound({
        throw: true,
      })

      return {
        description: "",
        title: APP_NAME,
      } satisfies PageMeta
    }

    const slug: BlogPostSlug = rawSlug
    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions<typeof blogMessages>({ locale, namespace: "pages.blog" }))
    const posts: Partial<typeof messages.posts> = messages.posts
    const post = posts[slug]

    return {
      description: post?.description ?? "",
      title: post?.title ?? APP_NAME,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.blog"],
  },
})
