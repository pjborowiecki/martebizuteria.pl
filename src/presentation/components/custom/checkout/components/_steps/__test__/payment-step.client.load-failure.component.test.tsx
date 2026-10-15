import { type JSX, type ReactNode } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as StripeCheckout from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { type CheckoutSessionStatus } from "~/src/modules/checkout/use-cases/get-checkout-session-status"

type CheckoutSession = StripeCheckout.CheckoutSession

type CheckoutState = "error" | "loading" | "success"

interface SessionRequest {
  heldSessionId: string | undefined
  session: CheckoutSession
}

interface NavigateOptions {
  search: (prev: Readonly<Record<string, unknown>>) => Record<string, unknown>
  to: string
}

const {
  checkoutStart,
  ensureCheckoutSession,
  formState,
  getStripe,
  navigate,
  paymentElementLoad,
  providerMounts,
  readStatus,
  resetCheckoutSession,
  setCheckoutSession,
  toastError,
  updatePhoneNumber,
} = vi.hoisted(() => ({
  checkoutStart: { fails: false },
  ensureCheckoutSession: vi.fn<() => Promise<CheckoutSession>>(),
  formState: { session: undefined as CheckoutSession | undefined },
  getStripe: vi.fn<(locale: string) => Promise<null>>(),
  navigate: vi.fn<(options: NavigateOptions) => Promise<void>>(),
  paymentElementLoad: { failed: false },
  providerMounts: { clientSecrets: [] as string[] },
  readStatus: vi.fn<(sessionId: string) => Promise<CheckoutSessionStatus>>(),
  resetCheckoutSession: vi.fn<(request: SessionRequest) => Promise<CheckoutSession>>(),
  setCheckoutSession: vi.fn<(session: CheckoutSession) => void>(),
  toastError: vi.fn<(message: string) => void>(),
  updatePhoneNumber: vi.fn<(phoneNumber: string) => Promise<unknown>>(),
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
vi.mock("~/src/integrations/stripe/stripe.client", () => ({ getStripe }))
vi.mock("~/src/integrations/stripe/stripe.actions", () => ({ createCheckoutSessionFn: vi.fn(), updateCheckoutSessionFn: vi.fn() }))
vi.mock("~/src/integrations/stripe/stripe.checkout", async () => {
  const actual = await vi.importActual<typeof StripeCheckout>("~/src/integrations/stripe/stripe.checkout")

  return { ...actual, ensureCheckoutSession, resetCheckoutSession }
})
vi.mock("~/src/modules/checkout/use-cases/get-checkout-session-status", async () => {
  const reactQuery = await import("@tanstack/react-query")
  const { CHECKOUT_QUERY_KEYS: KEYS } = await import("~/src/modules/checkout/checkout.constants")

  return {
    checkoutSessionStatusQuery: (sessionId: string) =>
      reactQuery.queryOptions({
        gcTime: 0,
        queryFn: () => readStatus(sessionId),
        queryKey: [...KEYS.SESSION_STATUS, sessionId],
        staleTime: "static",
      }),
  }
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
vi.mock("@stripe/react-stripe-js/checkout", async () => {
  const { createContext, use, useEffect, useState } = await import("react")
  const CheckoutStateContext = createContext<CheckoutState>("loading")

  return {
    CheckoutElementsProvider: ({
      children,
      options,
      stripe,
    }: Readonly<{ children: ReactNode; options: Readonly<{ clientSecret: string }>; stripe: Promise<null> }>): JSX.Element => {
      const [initialisedWith] = useState(() => ({ clientSecret: options.clientSecret, stripe }))
      const [state, setState] = useState<CheckoutState>("loading")
      useEffect(() => {
        providerMounts.clientSecrets.push(initialisedWith.clientSecret)
        void initialisedWith.stripe.then(
          () => {
            setState(checkoutStart.fails ? "error" : "success")
          },
          () => {
            setState("error")
          },
        )
      }, [initialisedWith])

      return <CheckoutStateContext value={state}>{children}</CheckoutStateContext>
    },
    PaymentElement: ({ onLoadError, onReady }: Readonly<{ onLoadError: () => void; onReady: () => void }>): JSX.Element => {
      useEffect(() => {
        if (paymentElementLoad.failed) {
          onLoadError()

          return
        }

        onReady()
      }, [onLoadError, onReady])

      return <div data-testid="payment-element" />
    },
    useCheckoutElements: () => {
      const state = use(CheckoutStateContext)

      return state === "success"
        ? { checkout: { canConfirm: true, total: { total: { amount: "PLN 215.00" } }, updatePhoneNumber }, type: "success" }
        : { type: state }
    },
  }
})

import { buildCheckoutValuesFingerprint } from "~/src/integrations/stripe/stripe.checkout"

import { useCartStore } from "~/src/modules/cart/cart.store"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"

const SESSION_LIFETIME_MS = 1_920_000

const PAY_BUTTON = "Order & Pay PLN 215.00"

const FORM_UNAVAILABLE = "We could not load the payment form"

const SESSION_REPLACED = "This payment session is no longer active. We've opened a new one — please choose a payment method and try again."

const session: CheckoutSession = {
  clientSecret: "cs_test_secret",
  expiresAt: Date.now() + SESSION_LIFETIME_MS,
  lines: [{ qty: 1, unitPrice: 20_000, variantId: "v-1" }],
  sessionId: "cs_test_1",
  totals: { discountTotal: 0, shippingTotal: 1500, subtotal: 20_000, taxTotal: 4020, total: 21_500, vatBasisPoints: 2300 },
  valuesFingerprint: buildCheckoutValuesFingerprint(completeValues),
}

const replacement: CheckoutSession = { ...session, clientSecret: "cs_test_secret_2", sessionId: "cs_test_2" }

const expectPayableForm = async (): Promise<void> => {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: PAY_BUTTON })).toBeEnabled()
  })
  expect(screen.queryByText(FORM_UNAVAILABLE)).not.toBeInTheDocument()
}

const retryAfterStripeCheckoutFailed = async (status: CheckoutSessionStatus): Promise<void> => {
  formState.session = session
  checkoutStart.fails = true
  readStatus.mockResolvedValue(status)
  renderWithProviders(<PaymentStep />)
  const retry = await screen.findByRole("button", { name: "Try again" })
  checkoutStart.fails = false

  await userEvent.setup().click(retry)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  formState.session = undefined
  checkoutStart.fails = false
  paymentElementLoad.failed = false
  providerMounts.clientSecrets = []
  getStripe.mockResolvedValue(null)
  navigate.mockResolvedValue(undefined)
  ensureCheckoutSession.mockResolvedValue(session)
  resetCheckoutSession.mockResolvedValue(replacement)
  updatePhoneNumber.mockResolvedValue({ type: "success" })
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

describe("PaymentStep when Stripe.js fails to download", () => {
  it("downloads Stripe.js again on Try again and opens the payment form for the same session", async () => {
    formState.session = session
    getStripe.mockRejectedValueOnce(new Error("Failed to load Stripe.js"))
    readStatus.mockResolvedValue("open")
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByText(FORM_UNAVAILABLE)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: PAY_BUTTON })).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }))

    await expectPayableForm()
    expect(getStripe).toHaveBeenCalledTimes(2)
    expect(getStripe).toHaveBeenLastCalledWith("en-US")
    expect(readStatus).toHaveBeenCalledExactlyOnceWith("cs_test_1")
    expect(providerMounts.clientSecrets).toStrictEqual(["cs_test_secret", "cs_test_secret"])
    expect(ensureCheckoutSession).not.toHaveBeenCalled()
    expect(resetCheckoutSession).not.toHaveBeenCalled()
  })
})

describe("PaymentStep when Stripe.js fails to download for a session that has closed meanwhile", () => {
  it("downloads Stripe.js again for the replacement session's form instead of reusing the failed download", async () => {
    formState.session = session
    getStripe.mockRejectedValueOnce(new Error("Failed to load Stripe.js"))
    readStatus.mockResolvedValue("closed")
    renderWithProviders(<PaymentStep />)

    await userEvent.setup().click(await screen.findByRole("button", { name: "Try again" }))

    await expectPayableForm()
    expect(providerMounts.clientSecrets).toStrictEqual(["cs_test_secret", "cs_test_secret_2"])
    expect(getStripe).toHaveBeenCalledTimes(2)
    expect(toastError).toHaveBeenCalledExactlyOnceWith(SESSION_REPLACED)
  })
})

describe("PaymentStep notice when the payment form fails", () => {
  it("announces the notice and moves focus to Try again, as the form it replaced is gone", async () => {
    formState.session = session
    getStripe.mockRejectedValueOnce(new Error("Failed to load Stripe.js"))
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByRole("alert")).toHaveTextContent(FORM_UNAVAILABLE)
    expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus()
  })

  it("gives both ways out finger-sized targets on touch screens", async () => {
    formState.session = session
    getStripe.mockRejectedValueOnce(new Error("Failed to load Stripe.js"))
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByRole("button", { name: "Try again" })).toHaveClass("pointer-coarse:h-10")
    expect(screen.getByRole("link", { name: "Back to cart" })).toHaveClass("pointer-coarse:h-10")
  })
})

describe("PaymentStep when Stripe Checkout cannot start for the session", () => {
  it("starts Stripe Checkout again in a new provider for a session that is still open", async () => {
    await retryAfterStripeCheckoutFailed("open")

    await expectPayableForm()
    expect(providerMounts.clientSecrets).toStrictEqual(["cs_test_secret", "cs_test_secret"])
    expect(getStripe).toHaveBeenCalledTimes(2)
    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("starts Stripe Checkout again when the session's state cannot be read", async () => {
    formState.session = session
    checkoutStart.fails = true
    readStatus.mockRejectedValue(new Error("network down"))
    renderWithProviders(<PaymentStep />)
    const retry = await screen.findByRole("button", { name: "Try again" })
    checkoutStart.fails = false

    await userEvent.setup().click(retry)

    await expectPayableForm()
    expect(providerMounts.clientSecrets).toHaveLength(2)
    expect(resetCheckoutSession).not.toHaveBeenCalled()
  })

  it("shows the loading form instead of the notice while it reads the session, so the shopper cannot retry twice", async () => {
    formState.session = session
    checkoutStart.fails = true
    const status = Promise.withResolvers<CheckoutSessionStatus>()
    readStatus.mockReturnValueOnce(status.promise)
    renderWithProviders(<PaymentStep />)
    const retry = await screen.findByRole("button", { name: "Try again" })
    checkoutStart.fails = false

    await userEvent.setup().click(retry)

    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument()
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
    expect(providerMounts.clientSecrets).toHaveLength(1)

    await act(async () => {
      status.resolve("open")
      await status.promise
    })

    await expectPayableForm()
    expect(readStatus).toHaveBeenCalledOnce()
  })

  it("opens a fresh session when the retry finds the session closed and says the form was replaced", async () => {
    await retryAfterStripeCheckoutFailed("closed")

    await expectPayableForm()
    expect(resetCheckoutSession).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ heldSessionId: undefined, session }))
    expect(setCheckoutSession).toHaveBeenCalledExactlyOnceWith(replacement)
    expect(toastError).toHaveBeenCalledExactlyOnceWith(SESSION_REPLACED)
    expect(providerMounts.clientSecrets).toStrictEqual(["cs_test_secret", "cs_test_secret_2"])
    expect(getStripe).toHaveBeenCalledTimes(2)
  })

  it("opens the confirmation when the retry finds the session paid", async () => {
    await retryAfterStripeCheckoutFailed("complete")

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledOnce()
    })
    expect(navigate.mock.calls[0]?.[0].search({})).toStrictEqual({ session_id: "cs_test_1", success: true })
    expect(resetCheckoutSession).not.toHaveBeenCalled()
  })

  it("waits for the bank when the retry finds the session's payment under way", async () => {
    await retryAfterStripeCheckoutFailed("processing")

    expect(await screen.findByText("Waiting for your bank")).toBeInTheDocument()
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe("PaymentStep when the Payment Element fails to load", () => {
  it("replaces the endless placeholder with the notice and loads the form again on Try again", async () => {
    formState.session = session
    paymentElementLoad.failed = true
    readStatus.mockResolvedValue("open")
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByText(FORM_UNAVAILABLE)).toBeInTheDocument()
    expect(screen.getByText("Stripe's secure payment form did not load. Check your internet connection and try again.")).toBeInTheDocument()
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: PAY_BUTTON })).not.toBeInTheDocument()

    paymentElementLoad.failed = false
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }))

    await expectPayableForm()
    expect(providerMounts.clientSecrets).toStrictEqual(["cs_test_secret", "cs_test_secret"])
    expect(resetCheckoutSession).not.toHaveBeenCalled()
  })
})
