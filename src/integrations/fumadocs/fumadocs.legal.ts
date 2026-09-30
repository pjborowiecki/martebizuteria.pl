import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { legalSource } from "~/src/integrations/fumadocs/fumadocs.source"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { handleField, localeField } from "~/src/modules/_core/utils/zod-fields"

export const LEGAL_DOCUMENT_SLUGS = {
  exchangesAndReturns: "exchanges-and-returns",
  privacyPolicy: "privacy-policy",
} as const

export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[keyof typeof LEGAL_DOCUMENT_SLUGS]

const getLegalPage = createServerFn({ method: "GET" })
  .validator(zod.object({ locale: localeField, slug: handleField }))
  .handler(({ data: { locale, slug } }) => {
    const page = legalSource.getPage([slug], locale)
    if (!page) {
      throw notFound()
    }

    return {
      description: page.data.description ?? "",
      path: page.path,
      title: page.data.title,
      updated: page.data.updated,
    }
  })

export const loadLegalPage = async (slug: LegalDocumentSlug) => {
  const [{ legalContent }, page] = await Promise.all([
    import("~/src/presentation/components/custom/legal-content"),
    getLegalPage({ data: { locale: getCurrentLocale(), slug } }),
  ])
  await legalContent.preload(page.path)

  return page
}
