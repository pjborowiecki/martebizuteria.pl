import { type ReactNode } from "react"

import { act, cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
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

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"

import { SecondaryNav } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/secondary-nav"
import { BrandLogo } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/brand-logo"
import { DesktopNav } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/desktop-nav"
import { MobileMenuToggle } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/mobile-menu-toggle"
import { NavLink } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/nav-link"
import { NavigationHeader } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-header"
import { NavigationProvider } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"
import { UserUtilityNav } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/user-utility-nav"
import {
  GOLD_585_COLLECTION_PATH,
  NAVIGATION_MENU_ID,
  NEW_ARRIVALS_COLLECTION_PATH,
  SILVER_925_COLLECTION_PATH,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

import { ROUTES } from "~/src/routes"

const renderInNavigation = (ui: ReactNode) => renderWithProviders(<NavigationProvider>{ui}</NavigationProvider>)

const cartLine: CartItem = {
  id: "line",
  image: "https://assets.test/ring.jpg",
  price: "100,00 zł",
  qty: 1,
  rawPrice: 10_000,
  slug: "silver-ring",
  title: "Ring",
  variantId: "variant",
  variantTitle: "One size",
}

describe("navigation chrome", () => {
  beforeEach(() => {
    useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: false })
    useCartStore.setState({ items: [] })
  })

  afterEach(() => {
    cleanup()
  })

  it("wraps the header contents in a sticky banner", () => {
    renderInNavigation(
      <NavigationHeader>
        <span>header slot</span>
      </NavigationHeader>,
    )

    expect(screen.getByRole("banner")).toContainElement(screen.getByText("header slot"))
    expect(screen.getByRole("banner").className).toContain("sticky")
  })

  it("adds a header border after scrolling and removes it at the top", () => {
    renderInNavigation(
      <NavigationHeader>
        <span>header slot</span>
      </NavigationHeader>,
    )
    const content = screen.getByText("header slot").parentElement
    expect(content).not.toHaveClass("border-border")

    act(() => {
      useNavigationStore.getState().setScrolled(true)
    })
    expect(content).toHaveClass("border-border")

    act(() => {
      useNavigationStore.getState().setScrolled(false)
    })
    expect(content).not.toHaveClass("border-border")
  })

  it("links the brand mark back to the storefront home", () => {
    renderInNavigation(<BrandLogo />)
    const link = screen.getByRole("link", { name: "M'ARTE" })

    expect(link).toHaveAttribute("href", ROUTES.HOME)
  })

  it("labels the desktop navigation and points each entry at its collection", () => {
    renderInNavigation(<DesktopNav />)
    const nav = screen.getByRole("navigation", { name: "Primary" })

    expect(nav).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "New arrivals" })).toHaveAttribute("href", NEW_ARRIVALS_COLLECTION_PATH)
    expect(screen.getByRole("link", { name: "Silver 925" })).toHaveAttribute("href", SILVER_925_COLLECTION_PATH)
    expect(screen.getByRole("link", { name: "Gold 585" })).toHaveAttribute("href", GOLD_585_COLLECTION_PATH)
    expect(screen.getByRole("link", { name: "Brand" })).toHaveAttribute("href", ROUTES.ABOUT)
  })

  it("marks no desktop entry as the current page", () => {
    renderInNavigation(<DesktopNav />)

    expect(screen.getByRole("link", { name: "New arrivals" })).not.toHaveAttribute("aria-current")
  })

  it("wires the mobile toggle to the fullscreen menu it controls", () => {
    renderInNavigation(<MobileMenuToggle />)
    const toggle = screen.getByRole("button", { name: /Open menu/u })

    expect(toggle).toHaveAttribute("aria-controls", NAVIGATION_MENU_ID)
    expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

  it("opens the fullscreen menu when the mobile toggle is pressed", async () => {
    renderInNavigation(<MobileMenuToggle />)

    await userEvent.click(screen.getByRole("button", { name: /Open menu/u }))

    expect(useNavigationStore.getState().menuOpen).toBe(true)
    expect(screen.getByRole("button", { name: /Open menu/u })).toHaveAttribute("aria-expanded", "true")
  })

  it("opens the search overlay from the utility bar", async () => {
    renderInNavigation(<UserUtilityNav />)

    await userEvent.click(screen.getByRole("button", { name: "Search" }))

    expect(useNavigationStore.getState().searchOpen).toBe(true)
  })

  it("sends the utility links to the account and cart pages", () => {
    renderInNavigation(<UserUtilityNav />)

    expect(screen.getByRole("link", { name: /Account/u })).toHaveAttribute("href", ROUTES.ACCOUNT)
    expect(screen.getByRole("link", { name: /Cart/u })).toHaveAttribute("href", ROUTES.CART)
  })

  it("starts the cart badge at zero", () => {
    renderInNavigation(<UserUtilityNav />)

    expect(screen.getByRole("link", { name: /Cart/u })).toHaveTextContent("0")
  })

  it("sums the quantities of every cart line into the badge", () => {
    useCartStore.setState({
      items: [
        { ...cartLine, id: "line-1", qty: 2, title: "Ring", variantId: "variant-1" },
        { ...cartLine, id: "line-2", qty: 3, title: "Necklace", variantId: "variant-2" },
      ],
    })
    renderInNavigation(<UserUtilityNav />)

    expect(screen.getByRole("link", { name: /Cart/u })).toHaveTextContent("5")
  })

  it("updates the live cart count when quantities change after mounting", () => {
    renderInNavigation(<UserUtilityNav />)
    const count = screen.getByText("0")
    expect(count).toHaveAttribute("aria-live", "polite")
    expect(count).toHaveAttribute("aria-atomic", "true")

    act(() => {
      useCartStore.setState({ items: [{ ...cartLine, qty: 3 }] })
    })

    expect(count).toHaveTextContent("3")
  })

  it("sums cart quantities in the fullscreen menu as well", () => {
    useCartStore.setState({ items: [{ ...cartLine, qty: 4 }] })
    renderInNavigation(<SecondaryNav />)

    expect(screen.getByRole("link", { name: /Cart/u })).toHaveTextContent("4")
    expect(screen.getByRole("link", { name: /Cart/u })).toHaveAttribute("href", "/cart")
  })
})

describe("NavLink", () => {
  beforeEach(() => {
    useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: false })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders a route link for a path target", () => {
    renderInNavigation(<NavLink hash="/collections/spring">Spring</NavLink>)

    expect(screen.getByRole("link", { name: "Spring" })).toHaveAttribute("href", "/collections/spring")
  })

  it("renders a button for an in-page section target", () => {
    renderInNavigation(<NavLink hash="#philosophy">Philosophy</NavLink>)

    expect(screen.getByRole("button", { name: "Philosophy" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Philosophy" })).toBeNull()
  })

  it("marks an active section button as the current page", () => {
    renderInNavigation(
      <NavLink active hash="#philosophy">
        Philosophy
      </NavLink>,
    )

    expect(screen.getByRole("button", { name: "Philosophy" })).toHaveAttribute("aria-current", "page")
  })

  it("dismisses an open menu before following a route link", async () => {
    useNavigationStore.setState({ menuOpen: true })
    renderInNavigation(<NavLink hash="/collections/spring">Spring</NavLink>)

    await userEvent.click(screen.getByRole("link", { name: "Spring" }))

    expect(useNavigationStore.getState().menuOpen).toBe(false)
  })

  it("marks the active route link as the current page", () => {
    renderInNavigation(
      <NavLink active hash="/collections/spring">
        Spring
      </NavLink>,
    )
    const link = screen.getByRole("link", { name: "Spring" })

    expect(link).toHaveAttribute("aria-current", "page")
    expect(link.className).toContain("text-foreground")
  })

  it("leaves an inactive route link muted and without aria-current", () => {
    renderInNavigation(<NavLink hash="/collections/spring">Spring</NavLink>)
    const link = screen.getByRole("link", { name: "Spring" })

    expect(link).not.toHaveAttribute("aria-current")
    expect(link.className).toContain("text-muted-foreground")
  })

  it("queues the section to scroll to while the fullscreen menu is open", async () => {
    useNavigationStore.setState({ menuOpen: true })
    renderInNavigation(<NavLink hash="#philosophy">Philosophy</NavLink>)

    await userEvent.click(screen.getByRole("button", { name: "Philosophy" }))

    expect(useNavigationStore.getState().pendingHash).toBe("philosophy")
    expect(useNavigationStore.getState().menuOpen).toBe(false)
  })
})
