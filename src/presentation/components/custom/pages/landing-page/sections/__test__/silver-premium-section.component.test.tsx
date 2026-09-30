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

import { SilverPremiumSection } from "~/src/presentation/components/custom/pages/landing-page/sections/silver-premium-section"

describe("SilverPremiumSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("splits the heading into a main word and an italic accent", () => {
    renderWithProviders(<SilverPremiumSection />)

    const heading = screen.getByRole("heading", { level: 2 })

    expect(heading).toHaveTextContent("Silver 925")
    expect(screen.getByText("925", { selector: "span" }).tagName).toBe("SPAN")
  })

  it("renders the eyebrow and the description", () => {
    renderWithProviders(<SilverPremiumSection />)

    expect(screen.getByText("Premium Collection")).toBeInTheDocument()
    expect(screen.getByText(/Our flagship 925 silver collection/u)).toBeInTheDocument()
  })

  it("links the primary action to the silver collection and the secondary one to all products", () => {
    renderWithProviders(<SilverPremiumSection />)

    expect(screen.getByRole("link", { name: "Discover the Collection" })).toHaveAttribute("href", "/collections/srebro-925")
    expect(screen.getByRole("link", { name: "View all products" })).toHaveAttribute("href", "/products")
  })

  it("renders every statistic with its label", () => {
    renderWithProviders(<SilverPremiumSection />)

    expect(screen.getByText("Silver purity")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getByText("Handmade")).toBeInTheDocument()
    expect(screen.getByText("2 years")).toBeInTheDocument()
    expect(screen.getByText("Warranty")).toBeInTheDocument()
  })

  it("anchors the section for the silver navigation link", () => {
    const { container } = renderWithProviders(<SilverPremiumSection />)

    expect(container.querySelector("section")).toHaveAttribute("id", "srebro")
  })
})
