import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"

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

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

vi.mock("~/src/hooks/use-wishlist", () => ({
  useWishlist: () => ({ isWishlisted: () => false, signedIn: false, toggle: vi.fn() }),
}))
vi.mock("~/src/modules/user/use-cases/record-customer-activity", () => ({
  recordCustomerActivity: () => Promise.resolve({ ok: true, recorded: false }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { loadGsap } from "~/src/integrations/gsap/gsap.loader"

import {
  ProductRelatedSection,
  type RelatedProductItem,
} from "~/src/presentation/components/custom/pages/product-page/sections/product-related-section"

const products: readonly RelatedProductItem[] = [
  {
    handle: "arc-cuff",
    id: "prod_1",
    image: "https://images.test/arc-cuff.webp",
    name: "Arc Cuff",
    subtitle: "Silver with moonstone",
    variantId: "var_1",
    variantPrice: 52_000,
    variantTitle: "Default",
  },
  {
    handle: "silhouette-ring",
    id: "prod_2",
    image: "https://images.test/ring.webp",
    name: "Silhouette Ring",
    subtitle: "Sterling silver 925",
  },
]

describe("ProductRelatedSection", () => {
  beforeAll(async () => {
    await loadGsap()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders nothing when there are no related products", () => {
    const { container } = renderWithProviders(<ProductRelatedSection products={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the section heading once there are products", () => {
    renderWithProviders(<ProductRelatedSection products={products} />)

    expect(screen.getByRole("heading", { level: 2, name: "Complete the Look" })).toBeInTheDocument()
  })

  it("renders one card per related product with its name and subtitle", () => {
    renderWithProviders(<ProductRelatedSection products={products} />)

    expect(screen.getByRole("heading", { level: 3, name: "Arc Cuff" })).toBeInTheDocument()
    expect(screen.getByText("Silver with moonstone")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Silhouette Ring" })).toBeInTheDocument()
    expect(screen.getByText("Sterling silver 925")).toBeInTheDocument()
  })

  it("formats the variant price from minor units", () => {
    renderWithProviders(<ProductRelatedSection products={products} />)

    expect(screen.getByText(/520\.00/u)).toBeInTheDocument()
  })

  it("omits the price for a product without a variant price", () => {
    renderWithProviders(<ProductRelatedSection products={products} />)

    expect(screen.getAllByText(/^PLN\s/u)).toHaveLength(1)
  })

  it("adds the lowest price of the 30 days before the reduction to a reduced product", () => {
    const reducedCuff: RelatedProductItem = {
      handle: "arc-cuff",
      id: "prod_1",
      image: "https://images.test/arc-cuff.webp",
      name: "Arc Cuff",
      priceReduction: { lowestPrice: 58_000 },
      subtitle: "Silver with moonstone",
      variantId: "var_1",
      variantPrice: 52_000,
    }
    renderWithProviders(<ProductRelatedSection products={[reducedCuff]} />)

    expect(screen.getByText("Lowest price in the 30 days before the reduction: PLN 580.00")).toBeInTheDocument()
  })

  it("links every card to its product handle", () => {
    renderWithProviders(<ProductRelatedSection products={products} />)

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/products/arc-cuff")
    expect(hrefs).toContain("/products/silhouette-ring")
  })
})
