import { type ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { LEGAL_DOCUMENT_SLUGS, loadLegalPage } from "~/src/integrations/fumadocs/fumadocs.legal"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { legalContent } from "~/src/presentation/components/custom/legal-content"

const ExchangesAndReturnsPage = (): ReactNode => legalContent.useContent(Route.useLoaderData().path)

export const Route = createFileRoute("/_storefront/exchanges-and-returns")({
  component: ExchangesAndReturnsPage,
  head: pageHead,
  loader: async () => {
    const page = await loadLegalPage(LEGAL_DOCUMENT_SLUGS.exchangesAndReturns)

    return {
      description: page.description,
      path: page.path,
      title: page.title,
    } satisfies PageMeta & { path: string }
  },
  wrapInSuspense: false,
})
