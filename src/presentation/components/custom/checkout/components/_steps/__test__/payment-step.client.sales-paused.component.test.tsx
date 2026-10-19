import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as StripeCheckout from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const { ensureCheckoutSession, navigate, onEdit, setCheckoutSession, toastError } = vi.hoisted(() => ({
  ensureCheckoutSession: vi.fn<() => Promise<StripeCheckout.CheckoutSession>>(),
  navigate: vi.fn<() => Promise<void>>(),
  onEdit: vi.fn<(stepId: string) => void>(),
  setCheckoutSession: vi.fn<(session: StripeCheckout.CheckoutSession) => void>(),
  toastError: vi.fn<(message: string) => void>(),
}))

const completeValues: CheckoutFormSchema = {
  address1: "ul. Krucza 1",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "inpost-courier",
  deliveryMethodType: "courier",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48123456789",
  postalCode: "00-001",
  sameAsShipping: true,
}

vi.mock("@wrksz/themes/client", () => ({ useTheme: () => ({ theme: "light" }) }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate }
})
vi.mock("~/src/integrations/stripe/stripe.client", () => ({ getStripe: () => Promise.resolve(null) }))
vi.mock("~/src/integrations/stripe/stripe.actions", () => ({ createCheckoutSessionFn: vi.fn(), updateCheckoutSessionFn: vi.fn() }))
vi.mock("~/src/integrations/stripe/stripe.checkout", async () => {
  const actual = await vi.importActual<typeof StripeCheckout>("~/src/integrations/stripe/stripe.checkout")

  return { ...actual, ensureCheckoutSession }
})
vi.mock("~/src/modules/checkout/use-cases/get-checkout-session-status", async () => {
  const { CHECKOUT_QUERY_KEYS } = await import("~/src/modules/checkout/checkout.constants")

  return { checkoutSessionStatusQuery: (sessionId: string) => ({ queryKey: [...CHECKOUT_QUERY_KEYS.SESSION_STATUS, sessionId] }) }
})
vi.mock("~/src/hooks/use-cart-availability", () => ({
  useCartAvailability: () => ({ hasUnavailableItems: false, isChecking: false, issues: [], issuesByVariantId: new Map() }),
}))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", async () => {
  const { useCallback } = await import("react")

  return {
    useCheckoutForm: () => {
      const getValues = useCallback(() => completeValues, [])

      return { checkoutSession: undefined, getValues, onEdit, setCheckoutSession }
    },
  }
})
vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  PaymentElement: (): JSX.Element => <div data-testid="payment-element" />,
  useCheckoutElements: () => ({ type: "loading" }),
}))

import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { useCartStore } from "~/src/hooks/use-cart-store"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"

const renderWatchingInvalidations = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
  renderWithProviders(<PaymentStep />, { queryClient })

  return invalidateQueries
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useCartStore.setState({
    items: [
      {
        id: "v-1",
        image: "/ring.avif",
        price: "200,00 zł",
        qty: 1,
        rawPrice: 20_000,
        slug: "silver-ring",
        title: "Silver Ring",
        variantId: "v-1",
        variantTitle: "One size",
      },
    ],
  })
})

afterEach(() => {
  cleanup()
  useCartStore.setState({ items: [] })
})

describe("PaymentStep when the server refuses a checkout because sales are paused", () => {
  it("explains the pause and asks the shop again, so the checkout swaps the form for the paused notice", async () => {
    ensureCheckoutSession.mockRejectedValue(new Error("SALES_PAUSED"))
    const invalidateQueries = renderWatchingInvalidations()

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: STORE_SETTING_QUERY_KEYS.SALES })
    })
    expect(toastError).toHaveBeenCalledExactlyOnceWith(
      "We have paused orders for a while, so this payment cannot go ahead. Your cart will wait until we reopen.",
    )
    expect(onEdit).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: CART_QUERY_KEYS.AVAILABILITY })
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: DELIVERY_METHOD_QUERY_KEYS.ALL })
  })

  it("leaves the sales status alone for a refusal that has nothing to do with the pause", async () => {
    ensureCheckoutSession.mockRejectedValue(new Error("INSUFFICIENT_INVENTORY"))
    const invalidateQueries = renderWatchingInvalidations()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledOnce()
    })
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: STORE_SETTING_QUERY_KEYS.SALES })
  })
})
