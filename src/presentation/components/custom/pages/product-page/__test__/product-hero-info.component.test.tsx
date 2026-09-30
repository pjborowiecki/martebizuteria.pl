import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { type Product } from "~/src/modules/product/product.types"

import { ProductHeroInfo } from "~/src/presentation/components/custom/pages/product-page/product-hero-info"

import { storefrontProduct, storefrontVariant } from "./storefront-product-fixture"

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `cdn/${path ?? "placeholder"}` }))
vi.mock("~/src/modules/customer-activity/customer-activity.tracking", () => ({ trackCartItemAdded: vi.fn() }))

class ObserverStub {
  disconnect(): void {
    return undefined
  }

  observe(): void {
    return undefined
  }

  unobserve(): void {
    return undefined
  }
}

const matchMediaStub = (query: string) => ({
  addEventListener: () => {},
  addListener: () => {},
  dispatchEvent: () => false,
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: () => {},
  removeListener: () => {},
})

const priceLabel = (majorUnits: number) => new Intl.NumberFormat("en-US", { currency: "PLN", style: "currency" }).format(majorUnits)

const priceText = (majorUnits: number) => priceLabel(majorUnits).replaceAll(/\s/gu, " ")

const renderInfo = (product: Product["storefront"], selectedVariant: Product["storefrontVariant"] | undefined = product.variants[0]) =>
  renderWithProviders(
    <ProductHeroInfo
      onSelectOptionValue={vi.fn<(optionId: string, valueId: string) => void>()}
      product={product}
      selectedValueIds={{}}
      selectedVariant={selectedVariant}
    />,
  )

describe("ProductHeroInfo", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
    vi.stubGlobal("IntersectionObserver", ObserverStub)
    vi.stubGlobal("matchMedia", matchMediaStub)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("heads the panel with the product title", () => {
    renderInfo(storefrontProduct({ title: "Silver ring" }))

    expect(screen.getByRole("heading", { level: 1, name: "Silver ring" })).toBeInTheDocument()
  })

  it("labels a product without a collection with the generic eyebrow", () => {
    renderInfo(storefrontProduct())

    expect(screen.getByText("Collection")).toBeInTheDocument()
  })

  it.each([
    [{ "en-US": "Atelier classics", "pl-PL": "Klasyka" }, "Atelier classics"],
    [{ "en-US": "", "pl-PL": "" }, "Collection"],
  ])("resolves the collection eyebrow with a fallback for blank titles", (titles, expected) => {
    renderInfo(
      storefrontProduct({
        collection: {
          createdAt: new Date("2026-01-01T00:00:00Z"),
          descriptions: null,
          handle: "classics",
          id: "collection-1",
          image: null,
          metadata: null,
          rank: 0,
          status: "active",
          titles,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
      }),
    )

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it("prices the selected variant in the shopper's locale", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ price: 120_000 })] }))

    expect(screen.getByText(priceText(1200))).toBeInTheDocument()
  })

  it("shows a placeholder price when no variant is selected", () => {
    renderInfo(storefrontProduct({ variants: [] }), undefined)

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("shows the sku of the selected variant", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ sku: "MR-001" })] }))

    expect(screen.getByText("SKU: MR-001")).toBeInTheDocument()
  })

  it("leaves the sku line out when the variant has none", () => {
    renderInfo(storefrontProduct())

    expect(screen.queryByText(/SKU:/u)).toBeNull()
  })

  it("offers the quantity picker and the add button while the variant is in stock", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 4 })] }))

    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeEnabled()
  })

  it("replaces the purchase row with a sold out notice", () => {
    renderInfo(storefrontProduct({ variants: [storefrontVariant({ quantityAvailable: 0 })] }))

    expect(screen.getByText("Out of stock")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add to cart" })).toBeNull()
  })

  it("shows the product subtitle as the detail line", () => {
    renderInfo(storefrontProduct({ subtitle: "Hand made in Krakow" }))

    expect(screen.getByText("Hand made in Krakow")).toBeInTheDocument()
  })

  it("falls back to the material specification for the detail line", () => {
    const product = storefrontProduct({
      variants: [
        storefrontVariant({
          specifications: [
            {
              allowedValues: null,
              handle: "material",
              rank: 0,
              titles: { "en-US": "Material", "pl-PL": "Material" },
              type: "text",
              unit: null,
              value: "Sterling silver",
            },
          ],
        }),
      ],
    })
    renderInfo(product)

    expect(screen.getByText("Sterling silver")).toBeInTheDocument()
  })

  it("keeps the description accordion beneath the purchase row", () => {
    renderInfo(storefrontProduct({ description: "A hand made ring." }))

    expect(screen.getByRole("button", { name: "Description" })).toBeInTheDocument()
    expect(screen.getByText("A hand made ring.")).toBeVisible()
  })

  it("adds the selected variant to the cart and confirms it", async () => {
    renderInfo(storefrontProduct({ handle: "silver-ring", variants: [storefrontVariant({ id: "variant-a", quantityAvailable: 4 })] }))

    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))

    expect(useCartStore.getState().items).toStrictEqual([
      {
        id: "variant-a",
        image: "cdn/placeholder",
        price: priceLabel(1200),
        qty: 1,
        rawPrice: 120_000,
        slug: "silver-ring",
        title: "Silver ring",
        variantId: "variant-a",
        variantTitle: "",
      },
    ])
    expect(screen.getByRole("button", { name: "Added to Cart" })).toBeInTheDocument()
  })

  it("hides the variant picker for a product without options", () => {
    renderInfo(storefrontProduct())

    expect(screen.queryByText("Gallery, specifications, and price update when you change the finish.")).toBeNull()
  })
})
