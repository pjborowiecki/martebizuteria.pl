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

import { HeroSection } from "~/src/presentation/components/custom/pages/landing-page/sections/hero-section"

describe("HeroSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the two heading lines in one level one heading", () => {
    renderWithProviders(<HeroSection />)

    const heading = screen.getByRole("heading", { level: 1 })

    expect(heading).toHaveTextContent("True art,without compromises")
    expect(screen.getByText("without compromises").tagName).toBe("SPAN")
  })

  it("renders the eyebrow badge, the description and the scroll hint", () => {
    renderWithProviders(<HeroSection />)

    expect(screen.getByText("Everyday elegance")).toBeInTheDocument()
    expect(screen.getByText(/In a world of mass copies, choose uniqueness/u)).toBeInTheDocument()
    expect(screen.getByText("Scroll to discover the world of M'ARTE")).toBeInTheDocument()
  })

  it("links the two calls to action to products and to the about page", () => {
    renderWithProviders(<HeroSection />)

    expect(screen.getByRole("link", { name: "Find something for yourself" })).toHaveAttribute("href", "/products")
    expect(screen.getByRole("link", { name: "Get to know us better" })).toHaveAttribute("href", "/about")
  })

  it("loads the hero image eagerly because it is above the fold", () => {
    renderWithProviders(<HeroSection />)

    expect(screen.getByAltText("Editorial jewelry composition on stone")).toHaveAttribute("loading", "eager")
  })
})
