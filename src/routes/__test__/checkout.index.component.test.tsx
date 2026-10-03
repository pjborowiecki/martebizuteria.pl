import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const search = vi.hoisted(() => ({ success: undefined as boolean | undefined }))

const availability = vi.hoisted(() => ({ hasUnavailableItems: false, isChecking: false, isFirstCheck: false }))

const navigation = vi.hoisted(() => ({
  navigate: vi.fn<(options: { readonly params?: (previous: Record<string, never>) => unknown; readonly to: string }) => Promise<void>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return {
    ...actual,
    useNavigate: () => navigation.navigate,
    useSearch: () => ({ success: search.success }),
  }
})

vi.mock("~/src/hooks/use-cart-availability", () => ({
  useCartAvailability: () => ({
    hasUnavailableItems: availability.hasUnavailableItems,
    isChecking: availability.isChecking,
    isFirstCheck: availability.isFirstCheck,
    issues: [],
    issuesByVariantId: new Map(),
  }),
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form.client", () => ({
  CheckoutForm: (): JSX.Element => <div data-testid="checkout-form" />,
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-skeleton", () => ({
  CheckoutFormSkeleton: (): JSX.Element => <div data-testid="checkout-skeleton" />,
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-success", () => ({
  CheckoutSuccess: (): JSX.Element => <div data-testid="checkout-success" />,
}))

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"

import { Route } from "~/src/routes/checkout.index"

const cartLine = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "variant-1",
  image: "products/aurora.jpg",
  price: "249,00 zł",
  qty: 1,
  rawPrice: 24_900,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId: "variant-1",
  variantTitle: "Rozmiar M",
  ...overrides,
})

const renderCheckout = () => {
  const CheckoutPage = Route.options.component
  if (CheckoutPage === undefined) {
    throw new Error("the checkout route registered no component")
  }

  return renderWithProviders(<CheckoutPage />)
}

beforeEach(() => {
  search.success = undefined
  availability.hasUnavailableItems = false
  availability.isChecking = false
  availability.isFirstCheck = false
  navigation.navigate.mockReset()
  useCartStore.getState().clearCart()
})

afterEach(cleanup)

describe("checkout page after payment", () => {
  it("shows the confirmation instead of the form", () => {
    search.success = true
    renderCheckout()

    expect(screen.getByTestId("checkout-success")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-form")).toBeNull()
  })

  it("does not send the shopper back to the cart", () => {
    search.success = true
    renderCheckout()

    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})

describe("checkout page guard", () => {
  it("shows the skeleton while the cart is still empty", () => {
    renderCheckout()

    expect(screen.getByTestId("checkout-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-form")).toBeNull()
  })

  it("sends an empty cart back to the cart page", async () => {
    renderCheckout()

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalled()
    })
    expect(navigation.navigate.mock.calls[0]?.[0]).toMatchObject({ replace: true, to: "/cart" })
    const currentParams = {}
    expect(navigation.navigate.mock.calls[0]?.[0].params?.(currentParams)).toBe(currentParams)
  })

  it("shows the checkout form once the cart holds an item", async () => {
    useCartStore.setState({ items: [cartLine()] })
    renderCheckout()

    expect(await screen.findByTestId("checkout-form")).toBeInTheDocument()
  })

  it("waits behind the skeleton until availability has been checked once", () => {
    useCartStore.setState({ items: [cartLine()] })
    availability.isChecking = true
    availability.isFirstCheck = true
    renderCheckout()

    expect(screen.getByTestId("checkout-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-form")).toBeNull()
  })

  it("keeps the form on screen while availability is checked again in the background", async () => {
    useCartStore.setState({ items: [cartLine()] })
    availability.isChecking = true
    renderCheckout()

    expect(await screen.findByTestId("checkout-form")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-skeleton")).toBeNull()
  })

  it("does not redirect while availability is still being checked", () => {
    useCartStore.setState({ items: [cartLine()] })
    availability.isChecking = true
    availability.hasUnavailableItems = true
    renderCheckout()

    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it("sends a cart with unavailable items back to the cart page", async () => {
    useCartStore.setState({ items: [cartLine()] })
    availability.hasUnavailableItems = true
    renderCheckout()

    await waitFor(() => {
      expect(navigation.navigate.mock.calls[0]?.[0]).toMatchObject({ to: "/cart" })
    })
    expect(screen.getByTestId("checkout-skeleton")).toBeInTheDocument()
  })
})
