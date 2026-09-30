import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

vi.hoisted(() => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      matches: query.includes("min-width"),
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })
})

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://assets.test",
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: () => true,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/integrations/better-auth/auth.session", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return { getCurrentSessionQuery: queryOptions({ queryFn: () => Promise.resolve(null), queryKey: ["session"] }) }
})
vi.mock("~/src/modules/storefront-search/use-cases/search-storefront", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    searchStorefrontQuery: (query: string) =>
      queryOptions({ queryFn: () => Promise.resolve({ categories: [], collections: [], products: [] }), queryKey: ["search", query] }),
  }
})
vi.mock("~/src/modules/storefront-search/use-cases/get-trending-searches", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return { getTrendingSearchesQuery: () => queryOptions({ queryFn: () => Promise.resolve([]), queryKey: ["trending"] }) }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { useCartStore } from "~/src/modules/cart/cart.store"

import { Navigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation"
import { NAVIGATION_MENU_ID } from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

import { ROUTES } from "~/src/routes"

describe("Navigation", () => {
  beforeEach(() => {
    useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: false })
    useCartStore.setState({ items: [] })
  })

  afterEach(() => {
    cleanup()
  })

  it("puts the brand mark, the desktop links and the utility links in one banner", () => {
    renderWithProviders(<Navigation />)
    const banner = within(screen.getByRole("banner"))

    expect(banner.getByRole("link", { name: "M'ARTE" })).toBeInTheDocument()
    expect(banner.getByRole("navigation", { name: "Primary" })).toBeInTheDocument()
    expect(banner.getByRole("button", { name: "Search" })).toBeInTheDocument()
  })

  it("keeps the mobile toggle pointing at the fullscreen menu it renders", () => {
    renderWithProviders(<Navigation />)

    expect(screen.getByRole("button", { name: /Open menu/u })).toHaveAttribute("aria-controls", NAVIGATION_MENU_ID)
    expect(document.querySelector(`#${NAVIGATION_MENU_ID}`)).not.toBeNull()
  })

  it("makes the fullscreen menu interactive when opened", async () => {
    useNavigationStore.setState({ menuOpen: true })
    renderWithProviders(<Navigation />)

    await waitFor(() => {
      expect(document.querySelector(`#${NAVIGATION_MENU_ID}`)).toHaveAttribute("aria-modal", "true")
    })
    expect(document.querySelector(`#${NAVIGATION_MENU_ID}`)).toHaveStyle({ pointerEvents: "auto" })
    expect(document.querySelector("[data-menu-backdrop]")).toHaveStyle({ pointerEvents: "auto" })
  })

  it("links the cart badge to the cart page", () => {
    renderWithProviders(<Navigation />)

    expect(screen.getByRole("link", { name: /Cart/u })).toHaveAttribute("href", ROUTES.CART)
  })

  it("renders the search overlay alongside the header", () => {
    renderWithProviders(<Navigation />)

    expect(screen.getByPlaceholderText("Search M'ARTE…")).toBeInTheDocument()
  })
})
