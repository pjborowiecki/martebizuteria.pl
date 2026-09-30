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

import { MaisonHeritageSection } from "~/src/presentation/components/custom/pages/landing-page/sections/maison-heritage-section"

describe("MaisonHeritageSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow, heading and description", () => {
    renderWithProviders(<MaisonHeritageSection />)

    expect(screen.getByText("About the brand")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Tradition and precision" })).toBeInTheDocument()
    expect(screen.getByText(/We were founded to combine classic jewelry techniques/u)).toBeInTheDocument()
  })

  it("links the call to action to the about page", () => {
    renderWithProviders(<MaisonHeritageSection />)

    expect(screen.getByRole("link", { name: "Discover our story" })).toHaveAttribute("href", "/about")
  })

  it("renders the main and the overlay image with their own alt texts", () => {
    renderWithProviders(<MaisonHeritageSection />)

    expect(screen.getByAltText("Handcrafting jewelry")).toBeInTheDocument()
    expect(screen.getByAltText("Close-up of a solitaire ring")).toBeInTheDocument()
  })

  it("anchors the section for the brand navigation link", () => {
    const { container } = renderWithProviders(<MaisonHeritageSection />)

    expect(container.querySelector("section")).toHaveAttribute("id", "marka")
  })
})
