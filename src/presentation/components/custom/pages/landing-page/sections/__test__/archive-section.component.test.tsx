import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { LANDING_ARCHIVE_ARTICLES } from "~/src/data/blog-posts"

import { ArchiveSection } from "~/src/presentation/components/custom/pages/landing-page/sections/archive-section"

describe("ArchiveSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow and the heading", () => {
    renderWithProviders(<ArchiveSection />)

    expect(screen.getByText("M'ARTE Guide")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Details matter" })).toBeInTheDocument()
  })

  it("renders one list item per archive article", () => {
    renderWithProviders(<ArchiveSection />)

    expect(screen.getAllByRole("listitem")).toHaveLength(LANDING_ARCHIVE_ARTICLES.length)
  })

  it("renders the translated title of every article", () => {
    renderWithProviders(<ArchiveSection />)

    expect(screen.getByText("Care ritual: how to properly care for your daily jewelry")).toBeInTheDocument()
    expect(screen.getByText("The art of proportion: how to build layered compositions")).toBeInTheDocument()
    expect(screen.getByText("Mineral guide: meaning and choice of natural stones")).toBeInTheDocument()
  })

  it("links every article to its blog post slug", () => {
    renderWithProviders(<ArchiveSection />)

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))

    for (const article of LANDING_ARCHIVE_ARTICLES) {
      expect(hrefs).toContain(`/blog/${article.slug}`)
    }
  })

  it("gives the editorial image an alt text", () => {
    renderWithProviders(<ArchiveSection />)

    expect(screen.getByAltText("Design desk with atelier tools")).toBeInTheDocument()
  })
})
