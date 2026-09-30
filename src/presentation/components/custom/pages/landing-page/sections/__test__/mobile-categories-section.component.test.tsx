import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const categories = vi.hoisted(() => [
  {
    handle: "naszyjniki",
    id: "cat_1",
    image: "https://images.test/necklaces.webp",
    shortDescriptions: { "en-US": "Close to the heart", "pl-PL": "Blisko serca" },
    subtitles: { "en-US": "Refined simplicity", "pl-PL": "Wyrafinowana prostota" },
    titles: { "en-US": "Necklaces", "pl-PL": "Naszyjniki" },
  },
  {
    handle: "kolczyki",
    id: "cat_2",
    image: "",
    shortDescriptions: { "en-US": "Framing the face", "pl-PL": "Oprawa twarzy" },
    subtitles: { "en-US": "Precise accents", "pl-PL": "Precyzyjne akcenty" },
    titles: { "en-US": "Earrings", "pl-PL": "Kolczyki" },
  },
])

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  getCategoriesQuery: () => ({ queryFn: () => Promise.resolve(categories), queryKey: ["categories"] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { MobileCategoriesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/mobile-categories-section"

describe("MobileCategoriesSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow, heading and description", async () => {
    renderWithProviders(<MobileCategoriesSection />)

    expect(await screen.findByRole("heading", { level: 2, name: "Space of choice" })).toBeInTheDocument()
    expect(screen.getByText("Categories")).toBeInTheDocument()
    expect(screen.getByText(/Our jewelry takes various shapes/u)).toBeInTheDocument()
  })

  it("renders one panel per category", async () => {
    renderWithProviders(<MobileCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Space of choice" })

    expect(screen.getAllByRole("article")).toHaveLength(categories.length)
  })

  it("uses the category subtitle as the panel heading and the title as its tag", async () => {
    renderWithProviders(<MobileCategoriesSection />)

    expect(await screen.findByRole("heading", { level: 3, name: "Refined simplicity" })).toBeInTheDocument()
    expect(screen.getByText("Necklaces")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Precise accents" })).toBeInTheDocument()
    expect(screen.getByText("Earrings")).toBeInTheDocument()
  })

  it("renders the short description of every category", async () => {
    renderWithProviders(<MobileCategoriesSection />)

    expect(await screen.findByText("Close to the heart")).toBeInTheDocument()
    expect(screen.getByText("Framing the face")).toBeInTheDocument()
  })

  it("links every panel to its category handle with the category name in the label", async () => {
    renderWithProviders(<MobileCategoriesSection />)

    expect(await screen.findByRole("link", { name: "Discover Necklaces" })).toHaveAttribute("href", "/categories/naszyjniki")
    expect(screen.getByRole("link", { name: "Discover Earrings" })).toHaveAttribute("href", "/categories/kolczyki")
  })

  it("labels every panel image with the panel heading", async () => {
    renderWithProviders(<MobileCategoriesSection />)

    expect(await screen.findByAltText("Refined simplicity")).toBeInTheDocument()
    expect(screen.getByAltText("Precise accents")).toBeInTheDocument()
  })
})
