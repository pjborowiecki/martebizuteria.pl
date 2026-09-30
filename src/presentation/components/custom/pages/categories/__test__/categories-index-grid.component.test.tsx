import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import { CategoriesIndexGrid } from "~/src/presentation/components/custom/pages/categories/categories-index-grid"
import { StorefrontCategoryCard } from "~/src/presentation/components/custom/pages/categories/category-card"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://cdn.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const category = (overrides: Partial<ProductCategory["storefrontListItem"]> = {}): ProductCategory["storefrontListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: "kolczyki",
  id: "cat-1",
  image: null,
  metadata: null,
  parentId: null,
  productCount: 3,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: locales("Kolczyki", "Earrings"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

afterEach(() => {
  cleanup()
})

describe("StorefrontCategoryCard", () => {
  it("shows the localized title and pluralized product count", () => {
    renderWithProviders(<StorefrontCategoryCard aspectRatioClass="" category={category()} sizes="100vw" />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Earrings")
    expect(screen.getByText("3 pieces")).toBeInTheDocument()
  })

  it("uses the singular form for a category holding one product", () => {
    renderWithProviders(<StorefrontCategoryCard aspectRatioClass="" category={category({ productCount: 1 })} sizes="100vw" />)

    expect(screen.getByText("1 piece")).toBeInTheDocument()
  })

  it("links to the category handle", () => {
    renderWithProviders(<StorefrontCategoryCard aspectRatioClass="" category={category()} sizes="100vw" />)

    expect(screen.getByRole("link")).toHaveAttribute("href", expect.stringContaining("kolczyki"))
  })

  it("hides the description unless it is asked for", () => {
    renderWithProviders(
      <StorefrontCategoryCard
        aspectRatioClass=""
        category={category({ shortDescriptions: locales("Krótki opis", "Short blurb") })}
        sizes="100vw"
      />,
    )

    expect(screen.queryByText("Short blurb")).not.toBeInTheDocument()
  })

  it("prefers the short description over the long one", () => {
    renderWithProviders(
      <StorefrontCategoryCard
        aspectRatioClass=""
        category={category({
          descriptions: locales("Długi opis", "Long description"),
          shortDescriptions: locales("Krótki opis", "Short blurb"),
        })}
        showDescription
        sizes="100vw"
      />,
    )

    expect(screen.getByText("Short blurb")).toBeInTheDocument()
    expect(screen.queryByText("Long description")).not.toBeInTheDocument()
  })

  it("falls back to the long description when there is no short one", () => {
    renderWithProviders(
      <StorefrontCategoryCard
        aspectRatioClass=""
        category={category({ descriptions: locales("Długi opis", "Long description") })}
        showDescription
        sizes="100vw"
      />,
    )

    expect(screen.getByText("Long description")).toBeInTheDocument()
  })

  it("labels the image with the category title", () => {
    const { container } = renderWithProviders(
      <StorefrontCategoryCard aspectRatioClass="" category={category({ image: "https://example.test/earrings.jpg" })} sizes="100vw" />,
    )

    expect(container.querySelector("img")).toHaveAttribute("alt", "Earrings")
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.test/earrings.jpg")
  })
})

describe("CategoriesIndexGrid", () => {
  it("renders nothing for an empty catalog", () => {
    const { container } = renderWithProviders(<CategoriesIndexGrid categories={[]} />)

    expect(container.querySelectorAll("a")).toHaveLength(0)
  })

  it("renders one card per category", () => {
    const categories = [
      category({ handle: "kolczyki", id: "cat-1", titles: locales("Kolczyki", "Earrings") }),
      category({ handle: "naszyjniki", id: "cat-2", titles: locales("Naszyjniki", "Necklaces") }),
      category({ handle: "bransoletki", id: "cat-3", titles: locales("Bransoletki", "Bracelets") }),
    ]
    renderWithProviders(<CategoriesIndexGrid categories={categories} />)

    expect(screen.getAllByRole("link")).toHaveLength(3)
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toStrictEqual([
      "Earrings",
      "Necklaces",
      "Bracelets",
    ])
  })

  it("pairs categories two per row and alternates the wide side", () => {
    const categories = Array.from({ length: 4 }, (_, index) =>
      category({ handle: `cat-${index}`, id: `cat-${index}`, titles: locales(`Kategoria ${index}`, `Category ${index}`) }),
    )
    const { container } = renderWithProviders(<CategoriesIndexGrid categories={categories} />)
    const rows = [...container.querySelectorAll(".reveal")]

    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveClass("lg:grid-cols-[8fr_5fr]")
    expect(rows[1]).toHaveClass("lg:grid-cols-[5fr_8fr]")
  })

  it("leaves the second slot of an odd trailing row empty", () => {
    const categories = [category({ handle: "kolczyki", id: "cat-1" })]
    const { container } = renderWithProviders(<CategoriesIndexGrid categories={categories} />)

    expect(container.querySelectorAll("a")).toHaveLength(1)
    expect(container.querySelector(String.raw`.hidden.lg\:block`)).not.toBeNull()
  })

  it("shows the description on every card in the grid", () => {
    const categories = [category({ handle: "kolczyki", id: "cat-1", shortDescriptions: locales("Krótki opis", "Short blurb") })]
    renderWithProviders(<CategoriesIndexGrid categories={categories} />)

    expect(screen.getByText("Short blurb")).toBeInTheDocument()
  })
})
