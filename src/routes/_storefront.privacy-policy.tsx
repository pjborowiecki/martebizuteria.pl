import { type ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { LEGAL_DOCUMENT_SLUGS, loadLegalPage } from "~/src/integrations/fumadocs/fumadocs.legal"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { legalContent } from "~/src/presentation/components/custom/legal-content"

const PrivacyPolicyPage = (): ReactNode => legalContent.useContent(Route.useLoaderData().path)

export const Route = createFileRoute("/_storefront/privacy-policy")({
  component: PrivacyPolicyPage,
  head: pageHead,
  loader: async () => {
    const page = await loadLegalPage(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    return {
      description: page.description,
      path: page.path,
      title: page.title,
    } satisfies PageMeta & { path: string }
  },
  wrapInSuspense: false,
})
