import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))

import { docsSource } from "~/src/integrations/fumadocs/fumadocs.docs"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { docsMdxComponents } from "~/src/presentation/components/custom/docs-mdx"

const DOCS_PAGES = I18N.SUPPORTED_LOCALES.flatMap((locale) => docsSource.getPages(locale).map((page) => ({ locale, page })))

describe("every documentation page", () => {
  it("finds the pages of both languages", () => {
    expect(DOCS_PAGES.length).toBeGreaterThan(I18N.SUPPORTED_LOCALES.length)
  })

  it.each(DOCS_PAGES)("renders $page.url in $locale without an error", ({ page }) => {
    expect(() => renderToStaticMarkup(createElement(page.data.body, { components: docsMdxComponents }))).not.toThrow()
  })
})
