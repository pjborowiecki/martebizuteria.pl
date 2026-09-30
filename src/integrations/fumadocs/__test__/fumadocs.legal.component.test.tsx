import { type ReactNode, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { LEGAL_DOCUMENT_SLUGS, type LegalDocumentSlug } from "~/src/integrations/fumadocs/fumadocs.legal"
import { legalSource } from "~/src/integrations/fumadocs/fumadocs.source"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { legalContent } from "~/src/presentation/components/custom/legal-content"

const SLUGS: readonly LegalDocumentSlug[] = Object.values(LEGAL_DOCUMENT_SLUGS)

const pagePath = (slug: LegalDocumentSlug, locale: SupportedLocale): string => {
  const page = legalSource.getPage([slug], locale)
  if (!page) {
    throw new Error(`no legal document for ${slug} in ${locale}`)
  }

  return page.path
}

const LegalBody = ({ path }: Readonly<{ path: string }>): ReactNode => legalContent.useContent(path)

const renderDocument = async (slug: LegalDocumentSlug, locale: SupportedLocale = "en-US") => {
  const path = pagePath(slug, locale)
  await legalContent.preload(path)
  const view = renderWithProviders(
    <Suspense>
      <LegalBody path={path} />
    </Suspense>,
  )
  await screen.findByRole("heading", { level: 1 })

  return view
}

afterEach(cleanup)

describe("the legal collection", () => {
  it.each(I18N.SUPPORTED_LOCALES)("carries every legal document in %s", (locale) => {
    for (const slug of SLUGS) {
      expect(legalSource.getPage([slug], locale)?.data.title).toBeTypeOf("string")
    }
  })

  it("titles each document from its own frontmatter rather than the fallback locale", () => {
    expect(legalSource.getPage([LEGAL_DOCUMENT_SLUGS.privacyPolicy], "pl-PL")?.data.title).toBe("Polityka prywatności")
    expect(legalSource.getPage([LEGAL_DOCUMENT_SLUGS.privacyPolicy], "en-US")?.data.title).toBe("Privacy policy")
  })

  it("reports no page for a slug that was never written", () => {
    expect(legalSource.getPage(["cookie-policy"], "en-US")).toBeUndefined()
  })
})

describe("the privacy policy document", () => {
  it("heads the page with the document title", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument()
  })

  it("names the data controller with its Bochnia address and tax number", async () => {
    const { container } = await renderDocument(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    expect(container.textContent).toContain("Pyciak Mariusz Firma Jubilerska")
    expect(container.textContent).toContain("ul. Wąska 11")
    expect(container.textContent).toContain("32-700 Bochnia")
    expect(container.textContent).toContain("NIP 8681772646")
  })

  it("offers the controller's address as a mailto link", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    expect(screen.getByRole("link", { name: "kontakt@martebizuteria.pl" })).toHaveAttribute("href", "mailto:kontakt@martebizuteria.pl")
  })

  it("sets out each GDPR section as its own heading", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.privacyPolicy)

    for (const heading of [
      "Data controller",
      "Why do we process your data?",
      "Who do we share data with?",
      "What rights do you have?",
      "What information do we collect through cookies?",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument()
    }
  })

  it("lists the data subject rights as real list items", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.privacyPolicy)
    const items = screen.getAllByRole("listitem").map((item) => item.textContent)

    expect(items).toContain("the right of access to your data (Article 15 GDPR),")
    expect(items).toContain("the right to lodge a complaint with the President of the Personal Data Protection Office.")
  })
})

describe("the exchanges and returns document", () => {
  it("states the fourteen day right of withdrawal", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.exchangesAndReturns)

    expect(screen.getByRole("heading", { level: 2, name: "Right to withdraw from the contract" })).toBeInTheDocument()
    expect(screen.getByText(/14-day right to withdraw from the contract/u)).toBeInTheDocument()
  })

  it("links both printable forms without localising the asset paths", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.exchangesAndReturns)

    expect(screen.getByRole("link", { name: "Download the return form" })).toHaveAttribute("href", "/forms/formularz_zwrotu.pdf")
    expect(screen.getByRole("link", { name: "Download the complaint form" })).toHaveAttribute("href", "/forms/formularz_reklamacji.pdf")
  })

  it("numbers the complaint steps as an ordered list", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.exchangesAndReturns)

    expect(screen.getAllByRole("list").some((list) => list.tagName === "OL")).toBe(true)
  })

  it("names the two year warranty in a highlighted notice", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.exchangesAndReturns)

    expect(screen.getAllByText("Important!").map((notice) => notice.tagName)).toStrictEqual(["STRONG", "STRONG"])
    expect(screen.getByText(/The warranty period for M'Arte jewellery is 2 years/u)).toBeInTheDocument()
  })

  it("keeps each line of the postal address on its own line", async () => {
    const { container } = await renderDocument(LEGAL_DOCUMENT_SLUGS.exchangesAndReturns)

    expect(container.querySelectorAll("br").length).toBeGreaterThanOrEqual(2)
  })
})

describe("the Polish documents", () => {
  it("give the Bochnia return address and never mention Warsaw", async () => {
    for (const slug of SLUGS) {
      const { container, unmount } = await renderDocument(slug, "pl-PL")

      expect(container.textContent).not.toMatch(/warsz/iu)
      unmount()
    }
  })

  it("head the Polish privacy policy in Polish", async () => {
    await renderDocument(LEGAL_DOCUMENT_SLUGS.privacyPolicy, "pl-PL")

    expect(screen.getByRole("heading", { level: 1, name: "Polityka prywatności" })).toBeInTheDocument()
  })
})
