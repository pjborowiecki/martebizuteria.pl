import { type ReactNode, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { docsSource } from "~/src/integrations/fumadocs/fumadocs.docs"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

const DocsBody = ({ path }: Readonly<{ path: string }>): ReactNode => docsContent.useContent(path)

const renderRootPage = async (locale: SupportedLocale) => {
  const page = docsSource.getPage([], locale)
  if (page === undefined) {
    throw new Error(`no documentation root page for ${locale}`)
  }
  await docsContent.preload(page.path)
  const view = renderWithProviders(
    <Suspense>
      <DocsBody path={page.path} />
    </Suspense>,
  )
  await screen.findByRole("heading", { level: 1 })

  return view
}

afterEach(cleanup)

describe("the documentation content loader", () => {
  it.each(I18N.SUPPORTED_LOCALES)("heads the page with its own frontmatter title in %s", async (locale) => {
    await renderRootPage(locale)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(locale === "pl-PL" ? "Dokumentacja" : "Documentation")
  })

  it("renders the markdown body of the page, not only its title", async () => {
    await renderRootPage("en-US")

    expect(screen.getByRole("heading", { level: 2, name: "Chapters" })).toBeInTheDocument()
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0)
  })

  it("wraps the whole page in a single article", async () => {
    await renderRootPage("en-US")

    expect(screen.getAllByRole("article")).toHaveLength(1)
  })
})
