import { type JSX, type ReactNode, useEffect } from "react"

import { type QueryClient } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as StripeCheckout from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

type CheckoutSession = StripeCheckout.CheckoutSession

interface SessionRequest {
  heldSessionId: string | undefined
}

interface NavigateOptions {
  search: (prev: Readonly<Record<string, unknown>>) => Record<string, unknown>
  to: string
}

const { confirmCheckoutSession, ensureCheckoutSession, formState, navigate, resetCheckoutSession, setCheckoutSession, toastError } =
  vi.hoisted(() => ({
    confirmCheckoutSession: vi.fn<() => Promise<StripeCheckout.ConfirmOutcome>>(),
    ensureCheckoutSession: vi.fn<(request: SessionRequest) => Promise<CheckoutSession>>(),
    formState: { session: undefined as CheckoutSession | undefined },
    navigate: vi.fn<(options: NavigateOptions) => Promise<void>>(),
    resetCheckoutSession: vi.fn<(request: SessionRequest) => Promise<CheckoutSession>>(),
    setCheckoutSession: vi.fn<(session: CheckoutSession) => void>(),
    toastError: vi.fn<(message: string) => void>(),
  }))

const completeValues: CheckoutFormSchema = {
  address1: "ul. Krucza 1",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "courier",
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

  return { ...actual, confirmCheckoutSession, ensureCheckoutSession, resetCheckoutSession }
})
vi.mock("~/src/modules/checkout/use-cases/get-checkout-session-status", async () => {
  const { CHECKOUT_QUERY_KEYS } = await import("~/src/modules/checkout/checkout.constants")

  return { checkoutSessionStatusQuery: (sessionId: string) => ({ queryKey: [...CHECKOUT_QUERY_KEYS.SESSION_STATUS, sessionId] }) }
})
vi.mock("~/src/hooks/use-cart-availability", () => ({
  useCartAvailability: () => ({ hasUnavailableItems: false, isChecking: false, issues: [], issuesByVariantId: new Map() }),
}))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", async () => {
  const { useCallback, useState } = await import("react")

  return {
    useCheckoutForm: () => {
      const [current, setCurrent] = useState(() => formState.session)
      const getValues = useCallback(() => completeValues, [])
      const publish = useCallback((next: CheckoutSession) => {
        setCheckoutSession(next)
        setCurrent(next)
      }, [])

      return { checkoutSession: current, getValues, onEdit: vi.fn(), setCheckoutSession: publish }
    },
  }
})
vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  PaymentElement: ({ onReady }: Readonly<{ onReady: () => void }>): JSX.Element => {
    useEffect(() => {
      onReady()
    }, [onReady])

    return <div data-testid="payment-element" />
  },
  useCheckoutElements: () => ({ checkout: { total: { total: { amount: "PLN 215.00" } } }, type: "success" }),
}))

import { PaidCheckoutSessionError, buildCheckoutValuesFingerprint } from "~/src/integrations/stripe/stripe.checkout"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { CHECKOUT_QUERY_KEYS } from "~/src/modules/checkout/checkout.constants"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"
import { loadCheckoutSessionId, saveCheckoutSession } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

const SESSION_LIFETIME_MS = 1_920_000

const session: CheckoutSession = {
  clientSecret: "cs_test_secret",
  expiresAt: Date.now() + SESSION_LIFETIME_MS,
  lines: [{ qty: 1, unitPrice: 20_000, variantId: "v-1" }],
  sessionId: "cs_test_1",
  totals: { discountTotal: 0, shippingTotal: 1500, subtotal: 20_000, taxTotal: 4020, total: 21_500, vatBasisPoints: 2300 },
  valuesFingerprint: buildCheckoutValuesFingerprint(completeValues),
}

const holdSessionFor = (sessionId: string, qty: number): void => {
  saveCheckoutSession({ lines: [{ qty, variantId: "v-1" }], sessionId })
}

const expectConfirmationOf = (sessionId: string, queryClient: QueryClient): void => {
  expect(navigate).toHaveBeenCalledOnce()
  const options = navigate.mock.calls[0]?.[0]

  expect(options?.to).toBe(".")
  expect(options?.search({ step: 4 })).toStrictEqual({ session_id: sessionId, step: 4, success: true })
  expect(queryClient.getQueryData([...CHECKOUT_QUERY_KEYS.SESSION_STATUS, sessionId])).toBe("complete")
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  formState.session = undefined
  navigate.mockResolvedValue(undefined)
  ensureCheckoutSession.mockResolvedValue(session)
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

describe("PaymentStep with a session that was paid before it could be continued", () => {
  it("opens the confirmation of the held session once, instead of a fresh payment form", async () => {
    holdSessionFor("cs_test_held", 1)
    ensureCheckoutSession.mockRejectedValue(new PaidCheckoutSessionError("cs_test_held"))
    const { queryClient } = renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })

    expectConfirmationOf("cs_test_held", queryClient)
    expect(ensureCheckoutSession).toHaveBeenCalledOnce()
    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(screen.queryByText("We couldn't prepare your payment")).not.toBeInTheDocument()
  })

  it("forgets a held session paid for another cart and opens a fresh checkout for this one", async () => {
    holdSessionFor("cs_test_paid_earlier", 2)
    ensureCheckoutSession.mockRejectedValueOnce(new PaidCheckoutSessionError("cs_test_paid_earlier"))
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(ensureCheckoutSession.mock.calls.map(([request]) => request.heldSessionId)).toStrictEqual(["cs_test_paid_earlier", undefined])
    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(setCheckoutSession).toHaveBeenCalledExactlyOnceWith(session)
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("opens the confirmation instead of asking for another attempt when the reset finds the payment went through", async () => {
    formState.session = session
    confirmCheckoutSession.mockResolvedValue({ message: "processing", recoverable: true, status: "error" })
    resetCheckoutSession.mockRejectedValue(new PaidCheckoutSessionError("cs_test_1"))
    const { queryClient } = renderWithProviders(<PaymentStep />)
    const user = userEvent.setup()
    const payButton = await screen.findByRole("button", { name: "Order & Pay PLN 215.00" })
    await waitFor(() => {
      expect(payButton).toBeEnabled()
    })

    await user.click(payButton)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })
    expectConfirmationOf("cs_test_1", queryClient)
    expect(toastError).not.toHaveBeenCalled()
  })
})
