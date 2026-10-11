import { type JSX } from "react"

import { createFileRoute, notFound } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { BLOG_POST_SLUGS } from "~/src/data/blog-posts"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import type blogMessages from "~/messages/en-US/pages.blog.json"
import { ROUTES } from "~/src/routes"

const BlogPostPage = (): JSX.Element => {
  const { slug } = Route.useParams()
  const t = useTranslations("pages.blog.post")
  const tPosts = useTranslations("pages.blog.posts")

  return (
    <main className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">M&apos;ARTE</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{tPosts(`${slug}.title`)}</h1>
      <p className="mt-6 text-base/relaxed text-muted-foreground">{tPosts(`${slug}.description`)}</p>

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
  loader: async ({ context, params: { slug } }) => {
    if (!BLOG_POST_SLUGS.includes(slug)) {
      throw notFound()
    }

    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions<typeof blogMessages>({ locale, namespace: "pages.blog" }))
    const posts: Partial<Record<string, PageMeta>> = messages.posts
    const post = posts[slug]
    if (post === undefined) {
      throw notFound()
    }

    return { description: post.description, title: post.title } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.blog"],
  },
})
