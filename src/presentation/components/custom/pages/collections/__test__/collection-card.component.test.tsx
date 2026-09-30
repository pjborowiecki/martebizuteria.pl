import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path.replace(/^\//u, "")}`,
  getBaseURL: () => "https://marte.test/",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) =>
    pathOrUrl.startsWith("https://") ? pathOrUrl : `https://assets.test/${pathOrUrl.replace(/^\//u, "")}`,
}))

import { CollectionCard } from "~/src/presentation/components/custom/pages/collections/collection-card"

const collection = {
  descriptions: { "en-US": "Pieces cast in warm gold.", "pl-PL": "Elementy odlane w ciepłym złocie." },
  handle: "gold-edit",
  id: "collection-1",
  image: "collections/gold.webp",
  titles: { "en-US": "The Gold Edit", "pl-PL": "Złota Edycja" },
}

afterEach(() => {
  cleanup()
})

describe("CollectionCard", () => {
  it("renders the English title as the card heading", () => {
    renderWithProviders(<CollectionCard collection={collection} />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("The Gold Edit")
  })

  it("renders the English description", () => {
    renderWithProviders(<CollectionCard collection={collection} />)

    expect(screen.getByText("Pieces cast in warm gold.")).toBeInTheDocument()
  })

  it("omits the description paragraph when there is none", () => {
    renderWithProviders(<CollectionCard collection={{ ...collection, descriptions: { "en-US": "", "pl-PL": "" } }} />)

    expect(screen.queryByText("Pieces cast in warm gold.")).not.toBeInTheDocument()
  })

  it("links to the collection by its handle", () => {
    renderWithProviders(<CollectionCard collection={collection} />)

    expect(screen.getByRole("link")).toHaveAttribute("href", "/collections/gold-edit")
  })

  it("labels the image with the collection title", () => {
    renderWithProviders(<CollectionCard collection={collection} />)

    expect(screen.getByRole("img", { name: "The Gold Edit" }).getAttribute("srcset")).toContain("collections/gold.webp")
  })

  it("falls back to the placeholder image when the collection has none", () => {
    renderWithProviders(<CollectionCard collection={{ ...collection, image: null }} />)

    expect(screen.getByRole("img", { name: "The Gold Edit" }).getAttribute("srcset")).not.toContain("collections/gold.webp")
  })
})
