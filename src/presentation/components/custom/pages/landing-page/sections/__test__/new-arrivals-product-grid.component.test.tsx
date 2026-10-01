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

const products = vi.hoisted(() => [
  {
    handle: "silver-ring",
    id: "prod_1",
    subtitles: { "en-US": "Sculpted band", "pl-PL": "Rzezbiona obraczka" },
    thumbnail: "https://images.test/ring.webp",
    titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
    variants: [{ id: "var_1", price: 25_000, title: "Default" }],
  },
  {
    handle: "gold-choker",
    id: "prod_2",
    subtitles: { "en-US": "Solid weave", "pl-PL": "Zwarty splot" },
    thumbnail: "",
    titles: { "en-US": "Gold choker", "pl-PL": "Zloty naszyjnik" },
    variants: [{ id: "var_2", price: 99_900, title: "Size M" }],
  },
  {
    handle: "pearl-earrings",
    id: "prod_3",
    subtitles: { "en-US": "Quiet glow", "pl-PL": "Cichy blask" },
    thumbnail: "https://images.test/earrings.webp",
    titles: { "en-US": "Pearl earrings", "pl-PL": "Perlowe kolczyki" },
  },
])

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
vi.mock("~/src/modules/customer-activity/use-cases/record-customer-activity", () => ({
  recordCustomerActivity: () => Promise.resolve({ ok: true, recorded: false }),
}))

vi.mock("~/src/modules/product/use-cases/get-new-arrivals", () => ({
  getNewArrivalsQuery: () => ({ queryFn: () => Promise.resolve(products), queryKey: ["new-arrivals"] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { LANDING_NEW_ARRIVALS_PRODUCT_LIMIT } from "~/src/modules/product/product.constants"

import {
  NewArrivalsProductGrid,
  NewArrivalsProductGridSkeleton,
} from "~/src/presentation/components/custom/pages/landing-page/sections/new-arrivals-product-grid"

describe("NewArrivalsProductGrid", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders one card per product with its localized title", async () => {
    renderWithProviders(<NewArrivalsProductGrid />)

    expect(await screen.findByRole("heading", { level: 3, name: "Silver ring" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Gold choker" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Pearl earrings" })).toBeInTheDocument()
  })

  it("renders the localized subtitle of every product", async () => {
    renderWithProviders(<NewArrivalsProductGrid />)

    expect(await screen.findByText("Sculpted band")).toBeInTheDocument()
    expect(screen.getByText("Solid weave")).toBeInTheDocument()
    expect(screen.getByText("Quiet glow")).toBeInTheDocument()
  })

  it("formats the first variant price from minor units", async () => {
    renderWithProviders(<NewArrivalsProductGrid />)

    expect(await screen.findByText(/250\.00/u)).toBeInTheDocument()
    expect(screen.getByText(/999\.00/u)).toBeInTheDocument()
  })

  it("omits the price when the product has no variant", async () => {
    renderWithProviders(<NewArrivalsProductGrid />)

    await screen.findByRole("heading", { level: 3, name: "Pearl earrings" })

    expect(screen.getAllByText(/^PLN\s/u)).toHaveLength(2)
  })

  it("links every card to its product handle", async () => {
    renderWithProviders(<NewArrivalsProductGrid />)

    await screen.findByRole("heading", { level: 3, name: "Silver ring" })
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/products/silver-ring")
    expect(hrefs).toContain("/products/gold-choker")
    expect(hrefs).toContain("/products/pearl-earrings")
  })
})

describe("NewArrivalsProductGridSkeleton", () => {
  afterEach(() => {
    cleanup()
  })

  it("announces that the grid is loading", () => {
    const { container } = renderWithProviders(<NewArrivalsProductGridSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true")
    expect(container.firstElementChild).toHaveAttribute("aria-label", "Loading new arrivals")
  })

  it("renders one placeholder card per expected product", () => {
    const { container } = renderWithProviders(<NewArrivalsProductGridSkeleton />)

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(LANDING_NEW_ARRIVALS_PRODUCT_LIMIT)
  })
})
