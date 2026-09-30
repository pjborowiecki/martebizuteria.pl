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
])

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

vi.mock("~/src/modules/customer-activity/use-cases/record-customer-activity", () => ({
  recordCustomerActivity: () => Promise.resolve({ ok: true, recorded: false }),
}))

vi.mock("~/src/modules/product/use-cases/get-new-arrivals", () => ({
  getNewArrivalsQuery: () => ({ queryFn: () => Promise.resolve(products), queryKey: ["new-arrivals"] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewArrivalsSection } from "~/src/presentation/components/custom/pages/landing-page/sections/new-arrivals-section"

describe("NewArrivalsSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow, heading and description", () => {
    renderWithProviders(<NewArrivalsSection />)

    expect(screen.getByText("M'ARTE premieres")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "New designs to discover" })).toBeInTheDocument()
    expect(screen.getByText(/Curated, original forms and noble glow/u)).toBeInTheDocument()
  })

  it("links the header action to all products", () => {
    renderWithProviders(<NewArrivalsSection />)

    expect(screen.getByRole("link", { name: "View all products" })).toHaveAttribute("href", "/products")
  })

  it("anchors the section for the new arrivals navigation link", () => {
    const { container } = renderWithProviders(<NewArrivalsSection />)

    expect(container.querySelector("section")).toHaveAttribute("id", "nowosci")
  })

  it("shows the loading grid before the products resolve and the products afterwards", async () => {
    renderWithProviders(<NewArrivalsSection />)

    expect(screen.getByLabelText("Loading new arrivals")).toBeInTheDocument()

    expect(await screen.findByRole("heading", { level: 3, name: "Silver ring" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Loading new arrivals")).not.toBeInTheDocument()
  })
})
