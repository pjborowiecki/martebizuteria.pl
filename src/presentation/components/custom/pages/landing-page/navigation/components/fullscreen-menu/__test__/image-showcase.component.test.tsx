import { cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface StorefrontCollection {
  handle: string
  id: string
  image: string | null
}

const catalogue = {
  collections: [] as StorefrontCollection[],
}

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://assets.test",
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: () => true,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve(catalogue.collections), queryKey: ["product-collection", "all"] }),
}))

import { ImageShowcase } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/image-showcase"
import { PRIMARY } from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

const showcaseImages = (): HTMLElement[] => screen.getAllByAltText("Editorial jewelry")

afterEach(() => {
  catalogue.collections = []
  cleanup()
})

describe("ImageShowcase", () => {
  it("renders one image per primary menu entry", () => {
    renderWithProviders(<ImageShowcase />)

    expect(showcaseImages()).toHaveLength(PRIMARY.length)
  })

  it("shows only the first image and hides the rest", () => {
    const { container } = renderWithProviders(<ImageShowcase />)
    const slides = [...container.querySelectorAll("[data-menu-image]")]

    expect(slides[0]).toHaveStyle({ opacity: "1" })
    expect(slides.slice(1).map((slide) => slide.getAttribute("style"))).toStrictEqual(
      slides.slice(1).map(() => "opacity: 0; visibility: hidden;"),
    )
  })

  it("indexes every slide in menu order", () => {
    const { container } = renderWithProviders(<ImageShowcase />)
    const indexes = [...container.querySelectorAll<HTMLElement>("[data-menu-image]")].map((slide) => slide.dataset["menuImage"])

    expect(indexes).toStrictEqual(PRIMARY.map((_item, index) => String(index)))
  })

  it("loads the first image eagerly and the rest lazily", () => {
    renderWithProviders(<ImageShowcase />)
    const images = showcaseImages()

    expect(images[0]).toHaveAttribute("loading", "eager")
    expect(images[1]).toHaveAttribute("loading", "lazy")
  })

  it("illustrates each collection entry with the image stored on that collection", async () => {
    catalogue.collections = [
      { handle: "nowosci", id: "1", image: "https://assets.test/collections/arrivals.webp" },
      { handle: "srebro-925", id: "2", image: "https://assets.test/collections/silver.webp" },
      { handle: "zloto-585", id: "3", image: "https://assets.test/collections/gold.webp" },
    ]
    renderWithProviders(<ImageShowcase />)

    await waitFor(() => {
      expect(showcaseImages()[2]).toHaveAttribute("src", "https://assets.test/collections/gold.webp")
    })
    expect(showcaseImages()[0]).toHaveAttribute("src", "https://assets.test/collections/arrivals.webp")
    expect(showcaseImages()[1]).toHaveAttribute("src", "https://assets.test/collections/silver.webp")
  })

  it("keeps the editorial entries on their own artwork", async () => {
    renderWithProviders(<ImageShowcase />)

    await waitFor(() => {
      expect(showcaseImages()[3]).toHaveAttribute("src", "https://assets.test/marketing/menu-collections.webp")
    })
    expect(showcaseImages()[4]).toHaveAttribute("src", "https://assets.test/marketing/editorial.webp")
    expect(showcaseImages()[5]).toHaveAttribute("src", "https://assets.test/marketing/menu-brand.webp")
  })

  it("falls back to the placeholder while the collections are still loading", () => {
    renderWithProviders(<ImageShowcase />)

    expect(showcaseImages()[2]).toHaveAttribute("src", "https://assets.test/placeholder.svg")
  })
})
