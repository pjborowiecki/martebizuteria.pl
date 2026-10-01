import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface SuggestedCollection {
  descriptions: Record<string, string>
  handle: string
  id: string
  image: string | null
  titles: Record<string, string>
}

interface SuggestedProductRow {
  handle: string
  id: string
  subtitles: Record<string, string> | null
  thumbnail: string | null
  titles: Record<string, string>
  variants: { id: string; price: number; title: string }[]
}

const catalogue = {
  collections: [] as SuggestedCollection[],
  newArrivals: [] as SuggestedProductRow[],
}

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://marte.test/",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => `https://assets.test/${pathOrUrl}`,
}))
vi.mock("~/src/hooks/use-wishlist", () => ({
  useWishlist: () => ({ isWishlisted: () => false, signedIn: false, toggle: vi.fn() }),
}))
vi.mock("~/src/modules/customer-activity/customer-activity.tracking", () => ({ trackCartItemAdded: vi.fn() }))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve(catalogue.collections), queryKey: ["product-collection", "all"] }),
}))
vi.mock("~/src/modules/product/use-cases/get-new-arrivals", () => ({
  getNewArrivalsQuery: () => ({ queryFn: () => Promise.resolve(catalogue.newArrivals), queryKey: ["product", "new-arrivals"] }),
}))

import { useCartStore } from "~/src/modules/cart/cart.store"
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils"

import { CollectionUnavailablePage } from "~/src/presentation/components/custom/pages/collections/collection-unavailable-page"

const collection = (id: string, title: string): SuggestedCollection => ({
  descriptions: { "en-US": `${title} description`, "pl-PL": `${title} opis` },
  handle: id,
  id,
  image: `collections/${id}.webp`,
  titles: { "en-US": title, "pl-PL": `${title} PL` },
})

const productRow = (id: string, title: string, price: number): SuggestedProductRow => ({
  handle: id,
  id,
  subtitles: { "en-US": `${title} subtitle`, "pl-PL": `${title} podtytul` },
  thumbnail: `products/${id}.webp`,
  titles: { "en-US": title, "pl-PL": `${title} PL` },
  variants: [{ id: `${id}-v1`, price, title: "Rozmiar M" }],
})

const renderPage = (): JSX.Element | null => {
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <CollectionUnavailablePage />
    </Suspense>,
  )

  return null
}

beforeEach(() => {
  catalogue.collections = [collection("gold-edit", "The Gold Edit"), collection("silver-edit", "The Silver Edit")]
  catalogue.newArrivals = [productRow("aurora-ring", "Aurora Ring", 24_900)]
  useCartStore.setState({ items: [] })
})

afterEach(() => {
  cleanup()
  useCartStore.setState({ items: [] })
})

describe("CollectionUnavailablePage header", () => {
  it("does not expose the internal default variant label when adding a suggestion to the cart", async () => {
    const product = productRow("aurora-ring", "Aurora Ring", 24_900)
    catalogue.newArrivals = [{ ...product, variants: [{ id: "variant-default", price: 24_900, title: DEFAULT_VARIANT_TITLE }] }]
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Add to Cart" }))

    expect(useCartStore.getState().items[0]).toMatchObject({ title: "Aurora Ring", variantId: "variant-default", variantTitle: "" })
  })

  it("offers an unpriced product suggestion when no variant is available", async () => {
    catalogue.newArrivals = [{ ...productRow("aurora-ring", "Aurora Ring", 24_900), variants: [] }]
    renderPage()

    expect(await screen.findByRole("link", { name: /Aurora Ring/u })).toBeInTheDocument()
    expect(screen.queryByText(/249/u)).not.toBeInTheDocument()
  })

  it("explains that the collection has gone", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("This edition is waiting for its moment")
    expect(screen.getByText("Collection")).toBeInTheDocument()
  })

  it("offers a way to the collections index and the full catalogue", async () => {
    renderPage()

    expect(await screen.findByRole("link", { name: "View collections" })).toHaveAttribute("href", "/collections")
    expect(screen.getByRole("link", { name: "Explore all products" })).toHaveAttribute("href", "/products")
  })
})

describe("CollectionUnavailablePage suggested collections", () => {
  it("shows the suggestions section with its heading", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 2, name: "Other collections to discover" })).toBeInTheDocument()
    expect(screen.getByText("Curated editions")).toBeInTheDocument()
  })

  it("links each suggested collection to its own page", async () => {
    renderPage()

    expect(await screen.findByRole("link", { name: /The Gold Edit/u })).toHaveAttribute("href", "/collections/gold-edit")
  })

  it("keeps at most three suggestions", async () => {
    catalogue.collections = ["a", "b", "c", "d", "e"].map((id) => collection(id, `Edition ${id}`))
    renderPage()

    await screen.findByRole("heading", { level: 2, name: "Other collections to discover" })

    expect(screen.getByRole("link", { name: /Edition a/u })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Edition d/u })).not.toBeInTheDocument()
  })

  it("drops the whole section when there is nothing to suggest", async () => {
    catalogue.collections = []
    renderPage()

    await screen.findByRole("heading", { level: 1 })

    expect(screen.queryByRole("heading", { level: 2, name: "Other collections to discover" })).not.toBeInTheDocument()
  })
})

describe("CollectionUnavailablePage suggested products", () => {
  it("shows the premieres section with its heading", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 2, name: "New forms to discover" })).toBeInTheDocument()
    expect(screen.getByText("M'ARTE premieres")).toBeInTheDocument()
  })

  it("names each product from its English title and links to the product page", async () => {
    renderPage()

    expect(await screen.findByRole("link", { name: /Aurora Ring/u })).toHaveAttribute("href", "/products/aurora-ring")
  })

  it("prices the first variant in złoty", async () => {
    renderPage()

    expect(await screen.findByText("PLN 249.00")).toBeInTheDocument()
  })

  it("shows the product subtitle beside the name", async () => {
    renderPage()

    expect(await screen.findByText("Aurora Ring subtitle")).toBeInTheDocument()
  })

  it("leaves the price out for a product with no variant", async () => {
    catalogue.newArrivals = [{ ...productRow("plain-ring", "Plain Ring", 0), variants: [] }]
    renderPage()

    await screen.findByRole("heading", { level: 2, name: "New forms to discover" })

    expect(screen.queryByText(/PLN/u)).not.toBeInTheDocument()
  })

  it("keeps at most three premieres", async () => {
    catalogue.newArrivals = ["a", "b", "c", "d"].map((id, index) => productRow(id, `Ring ${id}`, 10_000 + index))
    renderPage()

    await screen.findByRole("heading", { level: 2, name: "New forms to discover" })

    expect(screen.getByRole("link", { name: /Ring a/u })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Ring d/u })).not.toBeInTheDocument()
  })

  it("drops the whole section when there are no new arrivals", async () => {
    catalogue.newArrivals = []
    renderPage()

    await screen.findByRole("heading", { level: 1 })

    expect(screen.queryByRole("heading", { level: 2, name: "New forms to discover" })).not.toBeInTheDocument()
  })

  it("resolves the title in the active locale instead of showing every translation", async () => {
    catalogue.newArrivals = [productRow("aurora-ring", "Aurora Ring", 24_900)]
    renderPage()

    await screen.findByRole("heading", { level: 1 })

    expect(screen.queryByText("Aurora Ring PL")).not.toBeInTheDocument()
  })
})
