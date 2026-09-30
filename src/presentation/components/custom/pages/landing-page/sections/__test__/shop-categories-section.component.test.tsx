import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const buildCategory = vi.hoisted(() => (handle: string, title: string, productCount: number) => ({
  descriptions: null,
  handle,
  id: `cat_${handle}`,
  image: `https://images.test/${handle}.webp`,
  productCount,
  shortDescriptions: { "en-US": `${title} short`, "pl-PL": `${title} krotko` },
  subtitles: null,
  titles: { "en-US": title, "pl-PL": title },
}))

const categories = vi.hoisted(() => {
  const items: unknown[] = []

  return items
})

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

vi.mock("~/src/modules/product-category/use-cases/get-categories", () => ({
  getCategoriesQuery: () => ({ queryFn: () => Promise.resolve(categories), queryKey: ["categories", categories.length] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ShopCategoriesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/shop-categories-section"

const seed = (count: number): void => {
  categories.length = 0
  const names = ["Necklaces", "Earrings", "Chokers", "Bracelets", "Rings", "Pendants"]
  for (let index = 0; index < count; index += 1) {
    categories.push(buildCategory(`cat-${index}`, names[index] ?? `Category ${index}`, index + 1))
  }
}

describe("ShopCategoriesSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow, heading, description and the header link", async () => {
    seed(5)
    renderWithProviders(<ShopCategoriesSection />)

    expect(await screen.findByRole("heading", { level: 2, name: "Categories" })).toBeInTheDocument()
    expect(screen.getByText("Browse by type")).toBeInTheDocument()
    expect(screen.getByText(/Discover the full range of handcrafted jewelry/u)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View all categories" })).toHaveAttribute("href", "/categories")
  })

  it("shows at most five category cards", async () => {
    seed(6)
    renderWithProviders(<ShopCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Categories" })

    expect(screen.getAllByRole("heading", { level: 2 }).filter((heading) => heading.textContent !== "Categories")).toHaveLength(5)
    expect(screen.queryByRole("heading", { level: 2, name: "Pendants" })).not.toBeInTheDocument()
  })

  it("renders only the cards it has categories for", async () => {
    seed(2)
    renderWithProviders(<ShopCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Categories" })

    expect(screen.getByRole("heading", { level: 2, name: "Necklaces" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Earrings" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2, name: "Chokers" })).not.toBeInTheDocument()
  })

  it("pluralises the product count per card", async () => {
    seed(2)
    renderWithProviders(<ShopCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Categories" })

    expect(screen.getByText("1 piece")).toBeInTheDocument()
    expect(screen.getByText("2 pieces")).toBeInTheDocument()
  })

  it("links every card to its category handle", async () => {
    seed(2)
    renderWithProviders(<ShopCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Categories" })
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/categories/cat-0")
    expect(hrefs).toContain("/categories/cat-1")
  })

  it("renders no cards at all when there are no categories", async () => {
    seed(0)
    renderWithProviders(<ShopCategoriesSection />)

    await screen.findByRole("heading", { level: 2, name: "Categories" })

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1)
  })
})
