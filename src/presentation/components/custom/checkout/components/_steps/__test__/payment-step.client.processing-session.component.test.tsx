import { type JSX, type ReactNode, useEffect } from "react"

import { type QueryClient, noop } from "@tanstack/react-query"
import type * as TanStackRouter from "@tanstack/react-router"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as StripeCheckout from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { type CheckoutSessionStatus } from "~/src/modules/checkout/use-cases/get-checkout-session-status"

type CheckoutSession = StripeCheckout.CheckoutSession

interface SessionRequest {
  heldSessionId: string | undefined
}

interface NavigateOptions {
  search: (prev: Readonly<Record<string, unknown>>) => Record<string, unknown>
  to: string
}

const {
  confirmCheckoutSession,
  ensureCheckoutSession,
  formState,
  navigate,
  readStatus,
  resetCheckoutSession,
  setCheckoutSession,
  toastError,
  updatePhoneNumber,
} = vi.hoisted(() => ({
  confirmCheckoutSession: vi.fn<() => Promise<StripeCheckout.ConfirmOutcome>>(),
  ensureCheckoutSession: vi.fn<(request: SessionRequest) => Promise<CheckoutSession>>(),
  formState: { session: undefined as CheckoutSession | undefined },
  navigate: vi.fn<(options: NavigateOptions) => Promise<void>>(),
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
vi.mock("~/src/integrations/stripe/stripe.client", () => ({ getStripe: () => Promise.resolve(null) }))
vi.mock("~/src/integrations/stripe/stripe.actions", () => ({ createCheckoutSessionFn: vi.fn(), updateCheckoutSessionFn: vi.fn() }))
vi.mock("~/src/integrations/stripe/stripe.checkout", async () => {
  const actual = await vi.importActual<typeof StripeCheckout>("~/src/integrations/stripe/stripe.checkout")

  return { ...actual, confirmCheckoutSession, ensureCheckoutSession, resetCheckoutSession }
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
vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  PaymentElement: ({ onReady }: Readonly<{ onReady: () => void }>): JSX.Element => {
    useEffect(() => {
      onReady()
    }, [onReady])

    return <div data-testid="payment-element" />
  },
  useCheckoutElements: () => ({
    checkout: { canConfirm: true, total: { total: { amount: "PLN 215.00" } }, updatePhoneNumber },
    type: "success",
  }),
}))

import { buildCheckoutValuesFingerprint } from "~/src/integrations/stripe/stripe.checkout"
import { ProcessingCheckoutSessionError } from "~/src/integrations/stripe/stripe.checkout.processing"

import { CHECKOUT_QUERY_KEYS } from "~/src/modules/checkout/checkout.constants"

import { useCartStore } from "~/src/hooks/use-cart-store"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"
import { loadCheckoutSessionId, saveCheckoutSession } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

const SESSION_LIFETIME_MS = 1_920_000

const POLL_INTERVAL_MS = 8000

const AWAITING_BANK = "Waiting for your bank"

const NOT_COMPLETED = "Your payment was not completed. Choose a payment method to try again."

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

const statusNeverArrives = (): void => {
  readStatus.mockReturnValue(new Promise<CheckoutSessionStatus>(noop))
}

const reloadWhileTheBankConfirms = (sessionId: string): ReturnType<typeof renderWithProviders> => {
  holdSessionFor(sessionId, 1)
  ensureCheckoutSession.mockRejectedValueOnce(new ProcessingCheckoutSessionError(sessionId))

  return renderWithProviders(<PaymentStep />)
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
  vi.useRealTimers()
  useCartStore.setState({ items: [] })
})

describe("PaymentStep with a session whose payment the bank is still confirming", () => {
  it("waits for the bank on the session it holds instead of opening a second payment form", async () => {
    statusNeverArrives()
    const { queryClient } = reloadWhileTheBankConfirms("cs_test_held")

    expect(await screen.findByRole("status")).toHaveTextContent(AWAITING_BANK)
    expect(queryClient.getQueryData([...CHECKOUT_QUERY_KEYS.SESSION_STATUS, "cs_test_held"])).toBe("processing")
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
    expect(ensureCheckoutSession).toHaveBeenCalledOnce()
    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(loadCheckoutSessionId()).toBe("cs_test_held")
    expect(toastError).not.toHaveBeenCalled()
  })

  it("asks the bank's answer again on its own while the payment is still under way", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    readStatus.mockResolvedValue("processing")
    reloadWhileTheBankConfirms("cs_test_held")
    await screen.findByText(AWAITING_BANK)
    await waitFor(() => {
      expect(readStatus).toHaveBeenCalledOnce()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    expect(readStatus).toHaveBeenCalledTimes(2)
    expect(readStatus).toHaveBeenLastCalledWith("cs_test_held")
    expect(screen.getByText(AWAITING_BANK)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("opens the confirmation once the bank approves the payment", async () => {
    readStatus.mockResolvedValue("complete")
    const { queryClient } = reloadWhileTheBankConfirms("cs_test_held")

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })

    expectConfirmationOf("cs_test_held", queryClient)
    expect(ensureCheckoutSession).toHaveBeenCalledOnce()
    expect(toastError).not.toHaveBeenCalled()
  })

  it.each<CheckoutSessionStatus>(["open", "closed"])(
    "goes back to the payment form and says the payment did not go through when the session turns out %s",
    async (status) => {
      readStatus.mockResolvedValue(status)
      reloadWhileTheBankConfirms("cs_test_held")

      expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
      expect(toastError).toHaveBeenCalledExactlyOnceWith(NOT_COMPLETED)
      expect(ensureCheckoutSession.mock.calls.map(([request]) => request.heldSessionId)).toStrictEqual(["cs_test_held", "cs_test_held"])
      expect(setCheckoutSession).toHaveBeenCalledExactlyOnceWith(session)
      expect(screen.queryByText(AWAITING_BANK)).not.toBeInTheDocument()
      expect(navigate).not.toHaveBeenCalled()
    },
  )

  it("forgets a session the bank approved for another cart and opens a fresh checkout for this one", async () => {
    holdSessionFor("cs_test_paid_earlier", 2)
    ensureCheckoutSession.mockRejectedValueOnce(new ProcessingCheckoutSessionError("cs_test_paid_earlier"))
    readStatus.mockResolvedValue("complete")
    renderWithProviders(<PaymentStep />)

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(ensureCheckoutSession.mock.calls.map(([request]) => request.heldSessionId)).toStrictEqual(["cs_test_paid_earlier", undefined])
    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("waits for the bank instead of asking for another attempt when Stripe.js gives up on a BLIK payment the bank is still confirming", async () => {
    formState.session = session
    readStatus.mockResolvedValue("processing")
    confirmCheckoutSession.mockResolvedValue({ message: "Something went wrong. Please try again.", status: "failed" })
    renderWithProviders(<PaymentStep />)
    const user = userEvent.setup()
    const payButton = await screen.findByRole("button", { name: "Order & Pay PLN 215.00" })
    await waitFor(() => {
      expect(payButton).toBeEnabled()
    })

    await user.click(payButton)

    expect(await screen.findByText(AWAITING_BANK)).toBeInTheDocument()
    expect(readStatus).toHaveBeenCalledWith("cs_test_1")
    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("waits for the bank instead of asking for another attempt when the reset of a closed session finds the payment under way", async () => {
    formState.session = session
    readStatus.mockResolvedValueOnce("closed").mockReturnValue(new Promise<CheckoutSessionStatus>(noop))
    confirmCheckoutSession.mockResolvedValue({ message: "The checkout session is no longer active, please try again.", status: "failed" })
    resetCheckoutSession.mockRejectedValue(new ProcessingCheckoutSessionError("cs_test_1"))
    renderWithProviders(<PaymentStep />)
    const user = userEvent.setup()
    const payButton = await screen.findByRole("button", { name: "Order & Pay PLN 215.00" })
    await waitFor(() => {
      expect(payButton).toBeEnabled()
    })

    await user.click(payButton)

    expect(await screen.findByText(AWAITING_BANK)).toBeInTheDocument()
    expect(toastError).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})

const payForTheSessionOnScreen = async (): Promise<ReturnType<typeof renderWithProviders>> => {
  formState.session = session
  holdSessionFor(session.sessionId, 1)
  confirmCheckoutSession.mockResolvedValue({ status: "processing" })
  const rendered = renderWithProviders(<PaymentStep />)
  const payButton = await screen.findByRole("button", { name: "Order & Pay PLN 215.00" })
  await waitFor(() => {
    expect(payButton).toBeEnabled()
  })

  await userEvent.setup().click(payButton)

  return rendered
}

describe("PaymentStep after confirming a payment the bank has not settled yet", () => {
  it("waits for the bank instead of opening the confirmation of a payment that may still fail", async () => {
    statusNeverArrives()
    const { queryClient } = await payForTheSessionOnScreen()

    expect(await screen.findByRole("status")).toHaveTextContent(AWAITING_BANK)
    expect(queryClient.getQueryData([...CHECKOUT_QUERY_KEYS.SESSION_STATUS, "cs_test_1"])).toBe("processing")
    expect(navigate).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(loadCheckoutSessionId()).toBe("cs_test_1")
  })

  it("opens the confirmation once the bank settles the payment", async () => {
    readStatus.mockResolvedValue("complete")
    const { queryClient } = await payForTheSessionOnScreen()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })

    expectConfirmationOf("cs_test_1", queryClient)
    expect(toastError).not.toHaveBeenCalled()
  })

  it("says the payment did not go through and opens a fresh payment once the bank declines it", async () => {
    const replacement: CheckoutSession = { ...session, clientSecret: "cs_test_secret_2", sessionId: "cs_test_2" }
    readStatus.mockResolvedValue("closed")
    resetCheckoutSession.mockResolvedValue(replacement)
    await payForTheSessionOnScreen()

    await waitFor(() => {
      expect(setCheckoutSession).toHaveBeenCalledWith(replacement)
    })

    expect(toastError).toHaveBeenCalledExactlyOnceWith(NOT_COMPLETED)
    expect(resetCheckoutSession).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ heldSessionId: "cs_test_1" }))
    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(screen.queryByText(AWAITING_BANK)).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("lets the shopper pay the same session again when the bank turns the payment down while the session stays open", async () => {
    readStatus.mockResolvedValue("open")
    await payForTheSessionOnScreen()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith(NOT_COMPLETED)
    })

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument()
    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
