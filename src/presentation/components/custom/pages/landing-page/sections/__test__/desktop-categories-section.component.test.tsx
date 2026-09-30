import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.hoisted(() => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })
})

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
    handle: "bransoletki",
    id: "cat_2",
    image: "https://images.test/bracelets.webp",
    shortDescriptions: { "en-US": "Worn solo or layered", "pl-PL": "Solo lub warstwowo" },
    subtitles: { "en-US": "Fluid structures", "pl-PL": "Plynne struktury" },
    titles: { "en-US": "Bracelets", "pl-PL": "Bransoletki" },
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

import { DesktopCategoriesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/desktop-categories-section"

describe("DesktopCategoriesSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("opens the track with an intro panel carrying the section copy", async () => {
    renderWithProviders(<DesktopCategoriesSection />)

    expect(await screen.findByRole("heading", { level: 2, name: "Space of choice" })).toBeInTheDocument()
    expect(screen.getByText("Categories")).toBeInTheDocument()
    expect(screen.getByText(/Our jewelry takes various shapes/u)).toBeInTheDocument()
  })

  it("renders the intro panel plus one panel per category", async () => {
    renderWithProviders(<DesktopCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Space of choice" })

    expect(screen.getAllByRole("article")).toHaveLength(categories.length + 1)
  })

  it("uses the category subtitle as the panel heading and the title as its tag", async () => {
    renderWithProviders(<DesktopCategoriesSection />)

    expect(await screen.findByRole("heading", { level: 3, name: "Refined simplicity" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Fluid structures" })).toBeInTheDocument()
    expect(screen.getByText("Necklaces")).toBeInTheDocument()
    expect(screen.getByText("Bracelets")).toBeInTheDocument()
  })

  it("links every panel to its category handle", async () => {
    renderWithProviders(<DesktopCategoriesSection />)

    expect(await screen.findByRole("link", { name: "Discover Necklaces" })).toHaveAttribute("href", "/categories/naszyjniki")
    expect(screen.getByRole("link", { name: "Discover Bracelets" })).toHaveAttribute("href", "/categories/bransoletki")
  })

  it("anchors the section for the collections navigation link", async () => {
    const { container } = renderWithProviders(<DesktopCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Space of choice" })

    expect(container.querySelector("section")).toHaveAttribute("id", "kolekcje")
  })
})
