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

import { LANDING_SHOP_COLLECTIONS } from "~/src/data/landing"

import { ShopCollectionsSection } from "~/src/presentation/components/custom/pages/landing-page/sections/shop-collections-section"

describe("ShopCollectionsSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow, heading and description", () => {
    renderWithProviders(<ShopCollectionsSection />)

    expect(screen.getByText("Curated editions")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Our Collections" })).toBeInTheDocument()
    expect(screen.getByText("Themed selections created around mood, season, and occasion.")).toBeInTheDocument()
  })

  it("renders one card per configured collection", () => {
    renderWithProviders(<ShopCollectionsSection />)

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(LANDING_SHOP_COLLECTIONS.length)
  })

  it("renders the translated name and description of every collection", () => {
    renderWithProviders(<ShopCollectionsSection />)

    expect(screen.getByRole("heading", { level: 3, name: "New Arrivals" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Silver 925" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Gold 585" })).toBeInTheDocument()
    expect(screen.getByText(/The latest additions to our atelier/u)).toBeInTheDocument()
    expect(screen.getByText("Timeless jewelry made of the highest quality 925 silver.")).toBeInTheDocument()
    expect(screen.getByText("A collection of 585 gold jewelry, created to last.")).toBeInTheDocument()
  })

  it("links every card to its collection handle and the header to all collections", () => {
    renderWithProviders(<ShopCollectionsSection />)

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/collections")
    for (const collection of LANDING_SHOP_COLLECTIONS) {
      expect(hrefs).toContain(`/collections/${collection.slug}`)
    }
  })

  it("uses the collection name as the image alt text", () => {
    renderWithProviders(<ShopCollectionsSection />)

    expect(screen.getByAltText("New Arrivals")).toBeInTheDocument()
    expect(screen.getByAltText("Silver 925")).toBeInTheDocument()
    expect(screen.getByAltText("Gold 585")).toBeInTheDocument()
  })
})
