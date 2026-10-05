import { type JSX, type ReactNode, useEffect } from "react"

import { type StripeCheckoutElementsSdkOptions } from "@stripe/stripe-js"
import { QueryClient } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as StripeCheckout from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

type CheckoutSession = StripeCheckout.CheckoutSession

type ConfirmOutcome = StripeCheckout.ConfirmOutcome

interface SessionRequest {
  existing: CheckoutSession | undefined
  heldSessionId: string | undefined
  items: readonly { qty: number; variantId: string }[]
  values: CheckoutFormSchema
}

interface NavigateOptions {
  search: (prev: Readonly<Record<string, unknown>>) => Record<string, unknown>
  to: string
}

const {
  confirmCheckoutSession,
  elementsStatus,
  ensureCheckoutSession,
  getStripe,
  navigate,
  onEdit,
  paymentElementReady,
  providerOptions,
  resetCheckoutSession,
  setCheckoutSession,
  toastError,
  uiTheme,
} = vi.hoisted(() => ({
  confirmCheckoutSession: vi.fn<() => Promise<ConfirmOutcome>>(),
  elementsStatus: { current: "success" },
  ensureCheckoutSession: vi.fn<(request: SessionRequest) => Promise<CheckoutSession>>(),
  getStripe: vi.fn<(locale: string) => Promise<null>>(),
  navigate: vi.fn<(options: NavigateOptions) => Promise<void>>(),
  onEdit: vi.fn<(stepId: string) => void>(),
  paymentElementReady: { current: true },
  providerOptions: { current: undefined as StripeCheckoutElementsSdkOptions | undefined },
  resetCheckoutSession: vi.fn<(request: Omit<SessionRequest, "existing">) => Promise<CheckoutSession>>(),
  setCheckoutSession: vi.fn<(session: CheckoutSession) => void>(),
  toastError: vi.fn<(message: string) => void>(),
  uiTheme: { current: "light" },
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

const formState = {
  session: undefined as CheckoutSession | undefined,
  values: completeValues,
}

vi.mock("@wrksz/themes/client", () => ({ useTheme: () => ({ theme: uiTheme.current }) }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate }
})
vi.mock("~/src/integrations/stripe/stripe.client", () => ({ getStripe }))
vi.mock("~/src/integrations/stripe/stripe.actions", () => ({
  createCheckoutSessionFn: vi.fn(),
  updateCheckoutSessionFn: vi.fn(),
}))
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
      const getValues = useCallback(
        (field?: keyof CheckoutFormSchema) => (field === undefined ? formState.values : formState.values[field]),
        [],
      )
      const publish = useCallback((next: CheckoutSession) => {
        setCheckoutSession(next)
        setCurrent(next)
      }, [])

      return { checkoutSession: current, getValues, onEdit, setCheckoutSession: publish }
    },
  }
})
vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({
    children,
    options,
  }: Readonly<{ children: ReactNode; options: StripeCheckoutElementsSdkOptions }>): JSX.Element => {
    providerOptions.current = options

    return <div data-testid="elements">{children}</div>
  },
  PaymentElement: ({ onReady }: Readonly<{ onReady: () => void }>): JSX.Element => {
    useEffect(() => {
      if (paymentElementReady.current) {
        onReady()
      }
    }, [onReady])

    return <div data-testid="payment-element" />
  },
  useCheckoutElements: () =>
    elementsStatus.current === "success"
      ? { checkout: { id: "checkout-object", total: { total: { amount: "PLN 215.00", minorUnitsAmount: 21_500 } } }, type: "success" }
      : { type: elementsStatus.current },
}))

import { buildCheckoutValuesFingerprint } from "~/src/integrations/stripe/stripe.checkout"

import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { useCartStore } from "~/src/modules/cart/cart.store"
import { CHECKOUT_QUERY_KEYS } from "~/src/modules/checkout/checkout.constants"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"
import { saveCheckoutSession } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

const PAY_BUTTON = /^Order & Pay/u

const SESSION_LIFETIME_MS = 1_920_000

const session: CheckoutSession = {
  clientSecret: "cs_test_secret",
  expiresAt: Date.now() + SESSION_LIFETIME_MS,
  lines: [{ qty: 1, unitPrice: 20_000, variantId: "v-1" }],
  sessionId: "cs_test_1",
  totals: { discountTotal: 0, shippingTotal: 1500, subtotal: 20_000, taxTotal: 4020, total: 21_500, vatBasisPoints: 2300 },
  valuesFingerprint: buildCheckoutValuesFingerprint(completeValues),
}

const refreshedSession: CheckoutSession = { ...session, sessionId: "cs_test_2" }

const seedCart = (): void => {
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
}

const payButton = (): HTMLElement => screen.getByRole("button", { name: PAY_BUTTON })

const renderWatchingInvalidations = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
  renderWithProviders(<PaymentStep />, { queryClient })

  return invalidateQueries
}

const clickPay = async (): Promise<void> => {
  const user = userEvent.setup()

  await waitFor(() => {
    expect(payButton()).toBeEnabled()
  })
  await user.click(payButton())
}

beforeEach(() => {
  vi.clearAllMocks()
  elementsStatus.current = "success"
  paymentElementReady.current = true
  providerOptions.current = undefined
  uiTheme.current = "light"
  formState.session = undefined
  formState.values = completeValues
  localStorage.clear()
  getStripe.mockResolvedValue(null)
  ensureCheckoutSession.mockResolvedValue(session)
  resetCheckoutSession.mockResolvedValue(refreshedSession)
  confirmCheckoutSession.mockResolvedValue({ status: "success" })
  seedCart()
})

afterEach(() => {
  cleanup()
  useCartStore.setState({ items: [] })
})

describe("PaymentStep session bootstrap", () => {
  it("creates a session for the cart and the checkout details without sending a price", async () => {
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    })

    expect(ensureCheckoutSession.mock.calls[0]?.[0]).toStrictEqual({
      existing: undefined,
      heldSessionId: undefined,
      items: useCartStore.getState().items,
      values: completeValues,
    })
    expect(setCheckoutSession).toHaveBeenCalledWith(session)
  })

  it("passes the cart lines and the form values to the session builder", async () => {
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    })
    const request = ensureCheckoutSession.mock.calls[0]?.[0]

    expect(request?.items.map((item) => item.variantId)).toStrictEqual(["v-1"])
    expect(request?.values.email).toBe("anna@example.com")
  })

  it("sends the shopper back to the contact step when the form is incomplete", async () => {
    formState.values = { ...completeValues, phone: "" }
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith("contact")
    })

    expect(ensureCheckoutSession).not.toHaveBeenCalled()
  })

  it("does not open a session for an empty cart", async () => {
    useCartStore.setState({ items: [] })
    renderWithProviders(<PaymentStep />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(ensureCheckoutSession).not.toHaveBeenCalled()
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
  })

  it("reuses an existing session quoted for the same lines, prices and details", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByTestId("payment-element")).toBeInTheDocument()
    })

    expect(ensureCheckoutSession).not.toHaveBeenCalled()
  })

  it.each<Partial<CheckoutFormSchema>>([
    { address1: "ul. Nowa 42" },
    { email: "new-email@example.com" },
    { deliveryMethod: "other-courier" },
  ])("refreshes the saved session when checkout details change with the same cart: %j", async (changes) => {
    formState.session = session
    formState.values = { ...completeValues, ...changes }
    const updatedSession = { ...session, valuesFingerprint: buildCheckoutValuesFingerprint(formState.values) }
    ensureCheckoutSession.mockResolvedValue(updatedSession)
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledWith({
        existing: session,
        heldSessionId: undefined,
        items: useCartStore.getState().items,
        values: formState.values,
      })
    })
    expect(setCheckoutSession).toHaveBeenCalledWith(updatedSession)
    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
  })

  it("withholds the old payment form until changed checkout details have been saved", async () => {
    formState.session = session
    formState.values = { ...completeValues, address1: "ul. Nowa 42" }
    const pending = Promise.withResolvers<CheckoutSession>()
    ensureCheckoutSession.mockReturnValueOnce(pending.promise)
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole("button", { name: PAY_BUTTON })).not.toBeInTheDocument()
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()

    await act(async () => {
      pending.resolve({ ...session, valuesFingerprint: buildCheckoutValuesFingerprint(formState.values) })
      await pending.promise
    })

    expect(await screen.findByRole("button", { name: PAY_BUTTON })).toBeEnabled()
  })

  it("renders the payment intro and the Stripe element once a session exists", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByTestId("elements")).toBeInTheDocument()
    })

    expect(
      screen.getByText("Choose how you'd like to pay. All transactions are encrypted and securely processed by Stripe."),
    ).toBeInTheDocument()
  })

  it("asks Stripe for a client keyed to the active locale", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(getStripe).toHaveBeenCalledWith("en-US")
    })
  })

  it("matches the Stripe payment fields to the storefront dark theme", async () => {
    formState.session = session
    uiTheme.current = "dark"
    renderWithProviders(<PaymentStep />)

    await screen.findByTestId("payment-element")

    expect(providerOptions.current).toMatchObject({
      clientSecret: session.clientSecret,
      elementsOptions: { appearance: { theme: "night" } },
    })
  })
})

describe("PaymentStep prices", () => {
  it("puts the prices the session was quoted at into the cart, so the cart and the payment agree", async () => {
    const quoted = { ...session, lines: [{ qty: 1, unitPrice: 21_000, variantId: "v-1" }] }
    ensureCheckoutSession.mockResolvedValue(quoted)
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(useCartStore.getState().items[0]).toMatchObject({ priceChanged: true, rawPrice: 21_000 })
    expect(setCheckoutSession).toHaveBeenCalledExactlyOnceWith(quoted)
    expect(ensureCheckoutSession).toHaveBeenCalledOnce()
  })

  it("opens a replacement when the shop changes a price while the payment step is open", async () => {
    formState.session = session
    const requoted = { ...session, lines: [{ qty: 1, unitPrice: 18_000, variantId: "v-1" }], sessionId: "cs_test_requoted" }
    ensureCheckoutSession.mockResolvedValue(requoted)
    renderWithProviders(<PaymentStep />)
    await screen.findByTestId("payment-element")

    act(() => {
      useCartStore.getState().applyCurrentPrices([{ unitPrice: 18_000, variantId: "v-1" }])
    })

    await waitFor(() => {
      expect(setCheckoutSession).toHaveBeenCalledExactlyOnceWith(requoted)
    })
    expect(ensureCheckoutSession).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ existing: session }))
  })
})

describe("PaymentStep with a session the browser already holds", () => {
  beforeEach(() => {
    saveCheckoutSession({ lines: [{ qty: 1, variantId: "v-1" }], sessionId: "cs_test_held" })
  })

  it("continues the held session after a reload instead of opening another", async () => {
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    })

    expect(ensureCheckoutSession.mock.calls[0]?.[0]).toMatchObject({ existing: undefined, heldSessionId: "cs_test_held" })
  })

  it("resets the held session when a confirmation asks for a fresh one", async () => {
    formState.session = session
    confirmCheckoutSession.mockResolvedValue({ message: "expired", recoverable: true, status: "error" })
    renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(resetCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ heldSessionId: "cs_test_held", session }))
    })
  })
})

describe("PaymentStep when the session expires", () => {
  const RESTART_BUTTON = "Start the payment again"

  it("replaces the payment form with an expiry notice once the hold runs out", async () => {
    formState.session = { ...session, expiresAt: Date.now() + 50 }
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByText("Your payment session has expired")).toBeInTheDocument()
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to cart" })).toHaveAttribute("href", "/cart")
    expect(resetCheckoutSession).not.toHaveBeenCalled()
  })

  it("opens a fresh session only when the shopper asks to pay again", async () => {
    formState.session = { ...session, expiresAt: Date.now() - 1 }
    renderWithProviders(<PaymentStep />)

    await userEvent.click(await screen.findByRole("button", { name: RESTART_BUTTON }))

    await waitFor(() => {
      expect(setCheckoutSession).toHaveBeenCalledWith(refreshedSession)
    })
    expect(resetCheckoutSession).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ heldSessionId: undefined, items: useCartStore.getState().items, session: formState.session }),
    )
    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(screen.queryByText("Your payment session has expired")).not.toBeInTheDocument()
  })

  it("keeps the notice and explains why when a fresh session cannot be opened", async () => {
    formState.session = { ...session, expiresAt: Date.now() - 1 }
    resetCheckoutSession.mockRejectedValue(new Error("INSUFFICIENT_INVENTORY"))
    renderWithProviders(<PaymentStep />)

    await userEvent.click(await screen.findByRole("button", { name: RESTART_BUTTON }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Some items in your cart are out of stock.")
    })
    expect(screen.getByText("Your payment session has expired")).toBeInTheDocument()
    expect(setCheckoutSession).not.toHaveBeenCalled()
  })

  it("checks the cart again when the piece was sold after the hold ran out, so the checkout can send the shopper back", async () => {
    formState.session = { ...session, expiresAt: Date.now() - 1 }
    resetCheckoutSession.mockRejectedValue(new Error("INSUFFICIENT_INVENTORY"))
    const invalidateQueries = renderWatchingInvalidations()

    await userEvent.click(await screen.findByRole("button", { name: RESTART_BUTTON }))

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: CART_QUERY_KEYS.AVAILABILITY })
    })
  })
})

describe("PaymentStep session failures", () => {
  it("offers recovery without exposing a stale payment form when edited details cannot be saved", async () => {
    formState.session = session
    formState.values = { ...completeValues, address1: "ul. Nowa 42" }
    ensureCheckoutSession.mockRejectedValueOnce(new Error("network down"))
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: PAY_BUTTON })).not.toBeInTheDocument()

    const updatedSession = { ...session, valuesFingerprint: buildCheckoutValuesFingerprint(formState.values) }
    ensureCheckoutSession.mockResolvedValueOnce(updatedSession)
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(setCheckoutSession).toHaveBeenCalledWith(updatedSession)
    expect(ensureCheckoutSession).toHaveBeenCalledTimes(2)
  })

  it("shows the mapped checkout error and the recovery panel when the session cannot be opened", async () => {
    ensureCheckoutSession.mockRejectedValue(new Error("INSUFFICIENT_INVENTORY"))
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByText("We couldn't prepare your payment")).toBeInTheDocument()
    })

    expect(toastError).toHaveBeenCalledWith("Some items in your cart are out of stock.")
    expect(
      screen.getByText("Some items in your cart may no longer be available. Please review your cart and try again."),
    ).toBeInTheDocument()
  })

  it.each([
    ["the shop no longer has the stock to hold for it", "INSUFFICIENT_INVENTORY", "Some items in your cart are out of stock."],
    ["the shop took a piece in it off sale", "PRODUCT_NOT_FOUND", "A product in your cart is no longer available."],
  ])("checks the cart again when %s", async (_reason, code, toastMessage) => {
    ensureCheckoutSession.mockRejectedValue(new Error(code))
    const invalidateQueries = renderWatchingInvalidations()

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({ queryKey: CART_QUERY_KEYS.AVAILABILITY })
    })
    expect(toastError).toHaveBeenCalledWith(toastMessage)
  })

  it("falls back to the unknown-error copy for an unrecognised failure and leaves the cart check alone", async () => {
    ensureCheckoutSession.mockRejectedValue(new Error("boom"))
    const invalidateQueries = renderWatchingInvalidations()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Something went wrong. Please try again.")
    })
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it("retries the session when the shopper presses Try again", async () => {
    const user = userEvent.setup()
    ensureCheckoutSession.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(session)
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: "Try again" }))

    await waitFor(() => {
      expect(setCheckoutSession).toHaveBeenCalledWith(session)
    })

    expect(ensureCheckoutSession).toHaveBeenCalledTimes(2)
  })

  it("offers a way back to the cart from the recovery panel", async () => {
    ensureCheckoutSession.mockRejectedValue(new Error("boom"))
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Back to cart" })).toHaveAttribute("href", "/cart")
    })
  })
})

describe("PaymentStep payment form", () => {
  it("labels the submit button with the place-order copy and the total Stripe will take", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Order & Pay PLN 215.00" })).toBeEnabled()
    })
  })

  it("keeps the submit button disabled until the Stripe element reports it is ready", async () => {
    formState.session = session
    paymentElementReady.current = false
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByTestId("payment-element")).toBeInTheDocument()
    })

    expect(payButton()).toBeDisabled()
  })

  it("renders the terms and privacy links inside the agreement copy", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms-of-service")
    })

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy-policy")
  })
})

describe("PaymentStep confirmation", () => {
  it("confirms the session, records it as paid and opens the confirmation of the order it paid for", async () => {
    formState.session = session
    const { queryClient } = renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(confirmCheckoutSession).toHaveBeenCalledTimes(1)
    })

    expect(navigate).toHaveBeenCalledTimes(1)
    const options = navigate.mock.calls[0]?.[0]

    expect(options?.to).toBe(".")
    expect(options?.search({ step: 4 })).toStrictEqual({ session_id: "cs_test_1", step: 4, success: true })
    expect(queryClient.getQueryData([...CHECKOUT_QUERY_KEYS.SESSION_STATUS, "cs_test_1"])).toBe("complete")
  })

  it("surfaces an unrecoverable failure message without resetting the session", async () => {
    formState.session = session
    confirmCheckoutSession.mockResolvedValue({ message: "Your card was declined.", recoverable: false, status: "error" })
    renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Your card was declined.")
    })

    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("uses the generic payment copy when the failure carries no message", async () => {
    formState.session = session
    confirmCheckoutSession.mockResolvedValue({ message: "", recoverable: false, status: "error" })
    renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Payment failed. Please try again.")
    })
  })

  it("refreshes a stale session and tells the shopper to try again", async () => {
    formState.session = session
    confirmCheckoutSession.mockResolvedValue({ message: "expired", recoverable: true, status: "error" })
    renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(resetCheckoutSession).toHaveBeenCalledTimes(1)
    })

    expect(setCheckoutSession).toHaveBeenCalledWith(refreshedSession)
    expect(toastError).toHaveBeenCalledWith(
      "Your previous payment attempt is still processing or has expired. We've refreshed the payment — please choose a method and try again.",
    )
  })

  it("reports the mapped error when refreshing the stale session also fails", async () => {
    formState.session = session
    confirmCheckoutSession.mockResolvedValue({ message: "expired", recoverable: true, status: "error" })
    resetCheckoutSession.mockRejectedValue(new Error("INSUFFICIENT_INVENTORY"))
    renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Some items in your cart are out of stock.")
    })

    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("reports a thrown confirmation error by its own message", async () => {
    formState.session = session
    confirmCheckoutSession.mockRejectedValue(new Error("network down"))
    renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("network down")
    })

    expect(navigate).not.toHaveBeenCalled()
  })

  it("falls back to payment failure copy when confirmation rejects without an Error", async () => {
    formState.session = session
    confirmCheckoutSession.mockRejectedValue("connection lost")
    renderWithProviders(<PaymentStep />)
    await clickPay()

    expect(toastError).toHaveBeenCalledWith("Payment failed. Please try again.")
    expect(navigate).not.toHaveBeenCalled()
    expect(payButton()).toBeEnabled()
  })

  it("shows the recovery panel when Stripe reports the elements failed to load", async () => {
    formState.session = session
    elementsStatus.current = "error"
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByText("We couldn't prepare your payment")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
  })

  it("keeps the submit button disabled and names no amount while Stripe is still loading the checkout object", async () => {
    formState.session = session
    elementsStatus.current = "loading"
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByTestId("payment-element")).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: "Order & Pay" })).toBeDisabled()
  })

  it("takes no payment from a form submitted before Stripe has produced the checkout object", async () => {
    formState.session = session
    elementsStatus.current = "loading"
    renderWithProviders(<PaymentStep />)
    const element = await screen.findByTestId("payment-element")
    const form = element.closest("form")
    if (form === null) {
      throw new Error("the Stripe payment element is not inside the checkout form")
    }

    fireEvent.submit(form)

    expect(confirmCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Processing…" })).not.toBeInTheDocument()
    expect(payButton()).toBeDisabled()
  })
})

const renderWithPendingConfirmation = async () => {
  const confirmation = Promise.withResolvers<ConfirmOutcome>()
  const replacement = Promise.withResolvers<CheckoutSession>()
  formState.session = session
  confirmCheckoutSession.mockReturnValueOnce(confirmation.promise)
  ensureCheckoutSession.mockReturnValueOnce(replacement.promise)
  renderWithProviders(<PaymentStep />)
  await clickPay()

  return { confirmation, replacement }
}

describe("PaymentStep confirmation races", () => {
  it("keeps an in-flight replacement when the previous confirmation requests a session reset", async () => {
    const { confirmation, replacement } = await renderWithPendingConfirmation()
    expect(confirmCheckoutSession).toHaveBeenCalledTimes(1)

    act(() => {
      useCartStore.getState().applyCurrentPrices([{ unitPrice: 20_500, variantId: "v-1" }])
    })
    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    })
    expect(ensureCheckoutSession.mock.calls[0]?.[0]).toMatchObject({ existing: session })
    expect(screen.queryByRole("button", { name: PAY_BUTTON })).not.toBeInTheDocument()

    await act(async () => {
      confirmation.resolve({ message: "expired", recoverable: true, status: "error" })
      await confirmation.promise
    })

    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    const replacementSession = {
      ...refreshedSession,
      clientSecret: "replacement-secret",
      lines: [{ qty: 1, unitPrice: 20_500, variantId: "v-1" }],
    }
    await act(async () => {
      replacement.resolve(replacementSession)
      await replacement.promise
    })

    await waitFor(() => {
      expect(payButton()).toBeEnabled()
    })
    expect(setCheckoutSession).toHaveBeenCalledExactlyOnceWith(replacementSession)
    expect(providerOptions.current?.clientSecret).toBe("replacement-secret")
    expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    expect(resetCheckoutSession).not.toHaveBeenCalled()
  })
})
