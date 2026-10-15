import { type JSX } from "react"

import { focusManager, onlineManager } from "@tanstack/react-query"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const search = vi.hoisted(() => ({ session_id: undefined as string | undefined, success: undefined as boolean | undefined }))

const availability = vi.hoisted(() => ({ checks: 0, hasUnavailableItems: false, isChecking: false, isFirstCheck: false }))

const entry = vi.hoisted(() => ({
  check: vi.fn<(search: { readonly session_id?: string | undefined; readonly success?: boolean | undefined }) => void>(),
  view: "checkout" as "checking" | "checkout" | "confirmation",
}))

const sales = vi.hoisted(() => ({ fetchStatus: vi.fn<() => Promise<{ salesPaused: boolean }>>() }))

const navigation = vi.hoisted(() => ({
  navigate: vi.fn<(options: { readonly params?: (previous: Record<string, never>) => unknown; readonly to: string }) => Promise<void>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return {
    ...actual,
    useNavigate: () => navigation.navigate,
    useSearch: () => ({ session_id: search.session_id, success: search.success }),
  }
})

vi.mock("~/src/modules/delivery-method/use-cases/list-delivery-methods", () => ({ listDeliveryMethodsQuery: vi.fn() }))

vi.mock("~/src/modules/store-setting/use-cases/get-sales-status", async () => {
  const { STORE_SETTING_QUERY_KEYS: keys } = await import("~/src/modules/store-setting/store-setting.constants")

  return { getSalesStatusQuery: () => ({ queryFn: sales.fetchStatus, queryKey: keys.SALES }) }
})

vi.mock("~/src/hooks/use-cart-availability", () => ({
  useCartAvailability: () => {
    availability.checks += 1

    return {
      hasUnavailableItems: availability.hasUnavailableItems,
      isChecking: availability.isChecking,
      isFirstCheck: availability.isFirstCheck,
      issues: [],
      issuesByVariantId: new Map(),
    }
  },
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form.client", () => ({
  CheckoutForm: (): JSX.Element => <div data-testid="checkout-form" />,
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-skeleton", () => ({
  CheckoutFormSkeleton: (): JSX.Element => <div data-testid="checkout-skeleton" />,
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-sales-paused", () => ({
  CheckoutSalesPaused: (): JSX.Element => <div data-testid="checkout-sales-paused" />,
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-success", () => ({
  CheckoutSuccess: ({ sessionId }: Readonly<{ sessionId: string }>): JSX.Element => (
    <div data-session-id={sessionId} data-testid="checkout-success" />
  ),
}))

vi.mock("~/src/presentation/components/custom/checkout/hooks/use-checkout-session-entry", () => ({
  useCheckoutSessionEntry: (current: { readonly session_id?: string | undefined; readonly success?: boolean | undefined }) => {
    entry.check(current)

    return entry.view
  },
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
  search.session_id = undefined
  search.success = undefined
  entry.view = "checkout"
  entry.check.mockReset()
  availability.checks = 0
  availability.hasUnavailableItems = false
  availability.isChecking = false
  availability.isFirstCheck = false
  navigation.navigate.mockReset()
  sales.fetchStatus.mockReset().mockResolvedValue({ salesPaused: false })
  useCartStore.getState().clearCart()
})

afterEach(cleanup)

describe("checkout page after payment", () => {
  it("shows the confirmation of the paid session instead of the form", () => {
    search.session_id = "cs_paid"
    search.success = true
    entry.view = "confirmation"
    renderCheckout()

    expect(screen.getByTestId("checkout-success")).toHaveAttribute("data-session-id", "cs_paid")
    expect(screen.queryByTestId("checkout-form")).toBeNull()
  })

  it("still shows the confirmation of a session paid before sales were paused", async () => {
    sales.fetchStatus.mockResolvedValue({ salesPaused: true })
    search.session_id = "cs_paid"
    search.success = true
    entry.view = "confirmation"
    const { queryClient } = renderCheckout()

    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0)
    })
    expect(screen.getByTestId("checkout-success")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-sales-paused")).toBeNull()
  })

  it("does not send the shopper back to the cart", () => {
    search.session_id = "cs_paid"
    search.success = true
    entry.view = "confirmation"
    renderCheckout()

    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it("never shows a confirmation that names no session", () => {
    useCartStore.setState({ items: [cartLine()] })
    search.success = true
    entry.view = "confirmation"
    renderCheckout()

    expect(screen.queryByTestId("checkout-success")).toBeNull()
  })
})

describe("checkout page with a payment session to check", () => {
  it("asks about the session the address or the browser names", () => {
    search.session_id = "cs_returned"
    search.success = true
    renderCheckout()

    expect(entry.check).toHaveBeenCalledWith({ session_id: "cs_returned", success: true })
  })

  it("holds the skeleton and runs no availability check until the session's state is known", () => {
    useCartStore.setState({ items: [cartLine()] })
    entry.view = "checking"
    renderCheckout()

    expect(screen.getByTestId("checkout-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-form")).toBeNull()
    expect(screen.queryByTestId("checkout-success")).toBeNull()
    expect(availability.checks).toBe(0)
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

describe("checkout page while sales are paused", () => {
  it("explains that orders are paused instead of opening the checkout form", async () => {
    sales.fetchStatus.mockResolvedValue({ salesPaused: true })
    useCartStore.setState({ items: [cartLine()] })
    renderCheckout()

    expect(await screen.findByTestId("checkout-sales-paused")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-form")).toBeNull()
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it("does not ask again when the shopper comes back from the banking app, so a payment in progress keeps its form", async () => {
    useCartStore.setState({ items: [cartLine()] })
    renderCheckout()
    expect(await screen.findByTestId("checkout-form")).toBeInTheDocument()
    expect(sales.fetchStatus).toHaveBeenCalledOnce()

    await act(async () => {
      focusManager.setFocused(false)
      onlineManager.setOnline(false)
      onlineManager.setOnline(true)
      focusManager.setFocused(true)
      await Promise.resolve()
    })

    expect(sales.fetchStatus).toHaveBeenCalledOnce()
    focusManager.setFocused(undefined)
  })

  it("opens the checkout form while sales are open", async () => {
    useCartStore.setState({ items: [cartLine()] })
    renderCheckout()

    expect(await screen.findByTestId("checkout-form")).toBeInTheDocument()
    expect(screen.queryByTestId("checkout-sales-paused")).toBeNull()
  })
})
