import { cleanup, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const blog = vi.hoisted(() => ({ slugs: [] as string[] }))

vi.mock("~/src/data/blog-posts", () => ({
  get BLOG_POST_SLUGS() {
    return blog.slugs
  },
}))
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

import { TEST_LOCALE } from "~/src/platform/testing/lib/messages"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ArchiveSection } from "~/src/presentation/components/custom/pages/landing-page/sections/archive-section"

import landingMessages from "~/messages/en-US/pages.landing.json"

const ARTICLE_TITLES = {
  "layering-chains": "Layering chains",
  "silver-care": "Caring for silver",
}

const MESSAGES_WITH_ARTICLES = { pages: { landing: { archiveSection: { ...landingMessages.archiveSection, articles: ARTICLE_TITLES } } } }

const renderWithArticles = () => {
  blog.slugs = Object.keys(ARTICLE_TITLES)

  return renderWithProviders(
    <IntlProvider locale={TEST_LOCALE} messages={MESSAGES_WITH_ARTICLES}>
      <ArchiveSection />
    </IntlProvider>,
  )
}

afterEach(() => {
  cleanup()
  blog.slugs = []
})

describe("ArchiveSection without articles", () => {
  it("leaves the home page without a guide section", () => {
    const { container } = renderWithProviders(<ArchiveSection />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe("ArchiveSection with articles", () => {
  it("renders the eyebrow and the heading", () => {
    renderWithArticles()

    expect(screen.getByText("M'ARTE Guide")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Details matter" })).toBeInTheDocument()
  })

  it("titles every published article", () => {
    renderWithArticles()

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual(["Layering chains", "Caring for silver"])
  })

  it("links every article to its blog post", () => {
    renderWithArticles()

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      "/blog/layering-chains",
      "/blog/silver-care",
    ])
  })

  it("gives the editorial image an alt text", () => {
    renderWithArticles()

    expect(screen.getByAltText("Design desk with atelier tools")).toBeInTheDocument()
  })
})
