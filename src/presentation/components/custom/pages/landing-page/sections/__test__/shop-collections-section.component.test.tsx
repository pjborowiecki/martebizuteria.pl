import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

const buildCollection = vi.hoisted(
  () =>
    ({
      handle,
      title,
      description = null,
      image = null,
      shortDescription = null,
    }: {
      handle: string
      title: string
      description?: string | null
      image?: string | null
      shortDescription?: string | null
    }) => ({
      descriptions: description === null ? null : { "en-US": description, "pl-PL": `${description} PL` },
      handle,
      id: `col_${handle}`,
      image,
      shortDescriptions: shortDescription === null ? null : { "en-US": shortDescription, "pl-PL": `${shortDescription} PL` },
      titles: { "en-US": title, "pl-PL": `${title} PL` },
    }),
)

const collections = vi.hoisted((): unknown[] => [])

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve(collections), queryKey: ["collections", collections.length] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ShopCollectionsSection } from "~/src/presentation/components/custom/pages/landing-page/sections/shop-collections-section"

const seed = (...rows: readonly unknown[]): void => {
  collections.length = 0
  collections.push(...rows)
}

const seedCatalogue = (): void => {
  seed(
    buildCollection({
      description: "The latest additions to our atelier.",
      handle: "nowosci",
      image: "https://images.test/collections/arrivals.webp",
      title: "New arrivals",
    }),
    buildCollection({
      description: "Timeless 925 silver.",
      handle: "srebro-925",
      image: "https://images.test/collections/silver.webp",
      title: "Sterling silver 925",
    }),
    buildCollection({
      description: "585 gold, created to last.",
      handle: "zloto-585",
      image: "https://images.test/collections/gold.webp",
      title: "Gold 585",
    }),
  )
}

const renderSection = async (): Promise<void> => {
  renderWithProviders(<ShopCollectionsSection />)
  await screen.findByRole("heading", { level: 2, name: "Our Collections" })
}

describe("ShopCollectionsSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow, heading, description and the header link", async () => {
    seedCatalogue()
    await renderSection()

    expect(screen.getByText("Curated editions")).toBeInTheDocument()
    expect(screen.getByText("Themed selections created around mood, season, and occasion.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View all collections" })).toHaveAttribute("href", "/collections")
  })

  it("titles and describes every card from the collection record", async () => {
    seedCatalogue()
    await renderSection()

    expect(screen.getByRole("heading", { level: 3, name: "New arrivals" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Sterling silver 925" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Gold 585" })).toBeInTheDocument()
    expect(screen.getByText("585 gold, created to last.")).toBeInTheDocument()
  })

  it("illustrates every card with the image stored on its collection", async () => {
    seedCatalogue()
    await renderSection()

    expect(screen.getByAltText("Gold 585")).toHaveAttribute("src", "https://images.test/collections/gold.webp")
  })

  it("falls back to the placeholder when a collection carries no image", async () => {
    seed(buildCollection({ description: "585 gold, created to last.", handle: "zloto-585", title: "Gold 585" }))
    await renderSection()

    expect(screen.getByAltText("Gold 585")).toHaveAttribute("src", "https://images.test/placeholder.svg")
  })

  it("links every card to its collection handle", async () => {
    seedCatalogue()
    await renderSection()
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/collections/nowosci")
    expect(hrefs).toContain("/collections/srebro-925")
    expect(hrefs).toContain("/collections/zloto-585")
  })

  it("shows at most three collections so the row stays complete", async () => {
    seedCatalogue()
    collections.push(
      buildCollection({
        description: "Spring edition.",
        handle: "wiosna",
        image: "https://images.test/collections/spring.webp",
        title: "Spring",
      }),
    )
    await renderSection()

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3)
  })

  it("renders no cards at all when nothing is published", async () => {
    seed()
    await renderSection()

    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0)
  })

  it("prefers the short description over the full marketing copy", async () => {
    seed(
      buildCollection({
        description: "A long paragraph of marketing copy that belongs on the collection page itself.",
        handle: "zloto-585",
        shortDescription: "585 gold, created to last.",
        title: "Gold 585",
      }),
    )
    await renderSection()

    expect(screen.getByText("585 gold, created to last.")).toBeInTheDocument()
    expect(screen.queryByText(/A long paragraph of marketing copy/u)).toBeNull()
  })

  it("falls back to the full description when no short one is written", async () => {
    seed(buildCollection({ description: "Marketing copy for the gold collection.", handle: "zloto-585", title: "Gold 585" }))
    await renderSection()

    expect(screen.getByText("Marketing copy for the gold collection.")).toBeInTheDocument()
  })

  it("omits the paragraph when a collection carries no description", async () => {
    seed(buildCollection({ handle: "zloto-585", title: "Gold 585" }))
    await renderSection()

    expect(screen.getByRole("heading", { level: 3, name: "Gold 585" }).parentElement?.querySelector("p")).toBeNull()
  })
})
