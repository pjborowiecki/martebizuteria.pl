import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { getContentPageQuery } from "~/src/modules/content-page/use-cases/get-content-page"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { ContentPageArticle } from "~/src/presentation/components/custom/pages/content-page/content-page-article"

const FaqPage = (): JSX.Element => <ContentPageArticle handle={CONTENT_PAGE_HANDLE.FAQ} />

export const Route = createFileRoute("/_storefront/faq")({
  component: FaqPage,
  head: pageHead,
  loader: async ({ context }) => {
    const page = await context.queryClient.query(getContentPageQuery(CONTENT_PAGE_HANDLE.FAQ, context.locale))

    return { description: page.description, title: page.title } satisfies PageMeta
  },
})
