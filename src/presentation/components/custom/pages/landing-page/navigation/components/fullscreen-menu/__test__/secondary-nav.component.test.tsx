import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"

import { SecondaryNav } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/secondary-nav"

import { ROUTES } from "~/src/routes"

const { dismissMenuForRouteNavigation } = vi.hoisted(() => ({ dismissMenuForRouteNavigation: vi.fn() }))

vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider", () => ({
  useNavigation: () => ({ dismissMenuForRouteNavigation }),
}))
vi.mock("~/src/integrations/better-auth/auth.session", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return { getCurrentSessionQuery: queryOptions({ queryFn: () => Promise.resolve(null), queryKey: ["session"], staleTime: Infinity }) }
})

const renderMenu = (role: string | undefined) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(["session"], role === undefined ? null : { user: { role } })

  return renderWithProviders(<SecondaryNav />, { queryClient })
}

beforeEach(() => {
  vi.clearAllMocks()
  useCartStore.setState({ items: [] })
})

afterEach(cleanup)

describe("SecondaryNav account destinations", () => {
  it.each([
    { expected: ROUTES.AUTH_SIGN_IN, role: undefined },
    { expected: ROUTES.ACCOUNT_OVERVIEW, role: "customer" },
    { expected: ROUTES.ADMIN, role: "admin" },
  ])("sends $role visitors to $expected", ({ expected, role }) => {
    renderMenu(role)

    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", expected)
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", expected)
  })

  it.each(["Login", "My account", /Cart/u, "Contact", "Shipping & returns", "FAQ"])(
    "dismisses the menu when following %s",
    async (name) => {
      renderMenu(undefined)

      await userEvent.click(screen.getByRole("link", { name }))

      expect(dismissMenuForRouteNavigation).toHaveBeenCalledOnce()
    },
  )
})

describe("SecondaryNav help destinations", () => {
  it("links the contact, shipping and common questions pages", () => {
    renderMenu(undefined)

    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", ROUTES.ABOUT)
    expect(screen.getByRole("link", { name: "Shipping & returns" })).toHaveAttribute("href", ROUTES.EXCHANGES_AND_RETURNS)
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", ROUTES.FAQ)
  })
})

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

describe("SecondaryNav cart count", () => {
  it("counts every unit in the cart, not the number of lines", () => {
    useCartStore.setState({
      items: [
        { ...cartLine, id: "line-1", qty: 2, variantId: "variant-1" },
        { ...cartLine, id: "line-2", qty: 3, variantId: "variant-2" },
      ],
    })
    renderMenu(undefined)

    expect(screen.getByRole("link", { name: /Cart/u })).toHaveTextContent("Cart (5)")
  })

  it("shows an empty cart as no units", () => {
    renderMenu(undefined)

    expect(screen.getByRole("link", { name: /Cart/u })).toHaveTextContent("Cart (0)")
  })
})
