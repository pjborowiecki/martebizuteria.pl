import { type ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

const DocumentationIndexPage = (): ReactNode => docsContent.useContent(Route.useLoaderData().path)

export const Route = createFileRoute("/docs/")({
  component: DocumentationIndexPage,
  head: pageHead,
  loader: async () => {
    const page = await loadDocsPage()

    return {
      description: page.description,
      path: page.path,
      title: page.title,
    } satisfies PageMeta & { path: string }
  },
  wrapInSuspense: false,
})
