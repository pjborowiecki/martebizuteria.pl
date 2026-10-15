import { type JSX, type ReactNode, useEffect } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as StripeCheckout from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { type CheckoutSessionStatus } from "~/src/modules/checkout/use-cases/get-checkout-session-status"

type CheckoutSession = StripeCheckout.CheckoutSession

interface SessionRequest {
  heldSessionId: string | undefined
  session: CheckoutSession
}

const {
  confirmCheckoutSession,
  ensureCheckoutSession,
  formState,
  navigate,
  paymentElementMounts,
  readStatus,
  resetCheckoutSession,
  setCheckoutSession,
  selectedPaymentMethod,
  stripeCheckout,
  toastError,
  updatePhoneNumber,
  validateElements,
} = vi.hoisted(() => ({
  confirmCheckoutSession: vi.fn<() => Promise<StripeCheckout.ConfirmOutcome>>(),
  ensureCheckoutSession: vi.fn<() => Promise<CheckoutSession>>(),
  formState: { session: undefined as CheckoutSession | undefined },
  navigate: vi.fn<() => Promise<void>>(),
  paymentElementMounts: { count: 0 },
  readStatus: vi.fn<(sessionId: string) => Promise<CheckoutSessionStatus>>(),
  resetCheckoutSession: vi.fn<(request: SessionRequest) => Promise<CheckoutSession>>(),
  selectedPaymentMethod: { type: "card" },
  setCheckoutSession: vi.fn<(session: CheckoutSession) => void>(),
  stripeCheckout: { canConfirm: true },
  toastError: vi.fn<(message: string, options?: { description: string }) => void>(),
  updatePhoneNumber: vi.fn<(phoneNumber: string) => Promise<unknown>>(),
  validateElements: vi.fn<() => Promise<{ type: "error" | "success" }>>(),
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
  phone: "600 123 456",
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

  return {
    checkoutSessionStatusQuery: (sessionId: string) => ({
      queryFn: () => readStatus(sessionId),
      queryKey: [...CHECKOUT_QUERY_KEYS.SESSION_STATUS, sessionId],
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
  PaymentElement: ({
    onChange,
    onReady,
  }: Readonly<{ onChange: (event: { value: { type: string } }) => void; onReady: () => void }>): JSX.Element => {
    useEffect(() => {
      paymentElementMounts.count += 1
    }, [])
    useEffect(() => {
      onChange({ value: { type: selectedPaymentMethod.type } })
      onReady()
    }, [onChange, onReady])

    return <div data-testid="payment-element" />
  },
  useCheckoutElements: () => ({
    checkout: { canConfirm: stripeCheckout.canConfirm, total: { total: { amount: "PLN 215.00" } }, updatePhoneNumber, validateElements },
    type: "success",
  }),
}))

import { buildCheckoutValuesFingerprint } from "~/src/integrations/stripe/stripe.checkout"

import { useCartStore } from "~/src/modules/cart/cart.store"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"
import { saveCheckoutSession } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

const SESSION_LIFETIME_MS = 1_920_000

const PAY_BUTTON = "Order & Pay PLN 215.00"

const SESSION_REPLACED = "This payment session is no longer active. We've opened a new one — please choose a payment method and try again."

const NOT_ACTIVE = "The checkout session is no longer active, please try again."

const session: CheckoutSession = {
  clientSecret: "cs_test_secret",
  expiresAt: Date.now() + SESSION_LIFETIME_MS,
  lines: [{ qty: 1, unitPrice: 20_000, variantId: "v-1" }],
  sessionId: "cs_test_1",
  totals: { discountTotal: 0, shippingTotal: 1500, subtotal: 20_000, taxTotal: 4020, total: 21_500, vatBasisPoints: 2300 },
  valuesFingerprint: buildCheckoutValuesFingerprint(completeValues),
}

const replacement: CheckoutSession = { ...session, clientSecret: "cs_test_secret_2", sessionId: "cs_test_2" }

const payForTheSessionOnScreen = async (outcome: StripeCheckout.ConfirmOutcome): Promise<void> => {
  formState.session = session
  confirmCheckoutSession.mockResolvedValue(outcome)
  renderWithProviders(<PaymentStep />)
  const payButton = await screen.findByRole("button", { name: PAY_BUTTON })
  await waitFor(() => {
    expect(payButton).toBeEnabled()
  })

  await userEvent.setup().click(payButton)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  formState.session = undefined
  paymentElementMounts.count = 0
  selectedPaymentMethod.type = "card"
  stripeCheckout.canConfirm = true
  validateElements.mockResolvedValue({ type: "success" })
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

describe("PaymentStep pay button", () => {
  it("hands Stripe the shopper's phone number once the payment form loads, so Stripe can tell when the payment is ready", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(updatePhoneNumber).toHaveBeenCalledWith("+48600123456")
    })
  })

  it("looks unavailable but stays focusable while Stripe says the payment details are not complete", async () => {
    formState.session = session
    stripeCheckout.canConfirm = false
    renderWithProviders(<PaymentStep />)
    const payButton = await screen.findByRole("button", { name: PAY_BUTTON })

    await waitFor(() => {
      expect(payButton).toBeEnabled()
    })
    expect(payButton).toHaveAttribute("aria-disabled", "true")
  })

  it("asks Stripe to point out the missing payment details and confirms nothing when they are incomplete", async () => {
    stripeCheckout.canConfirm = false
    validateElements.mockResolvedValue({ type: "error" })

    await payForTheSessionOnScreen({ status: "success" })

    await waitFor(() => {
      expect(validateElements).toHaveBeenCalledOnce()
    })
    expect(confirmCheckoutSession).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("confirms once Stripe finds the payment details complete although it has not yet reported the payment ready", async () => {
    stripeCheckout.canConfirm = false

    await payForTheSessionOnScreen({ status: "success" })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledOnce()
    })
    expect(validateElements).toHaveBeenCalledOnce()
    expect(confirmCheckoutSession).toHaveBeenCalledOnce()
  })

  it("confirms without asking Stripe to validate again once it reports the payment ready", async () => {
    await payForTheSessionOnScreen({ status: "success" })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledOnce()
    })
    expect(validateElements).not.toHaveBeenCalled()
  })
})

describe("PaymentStep when a BLIK payment is refused", () => {
  it.each([
    { message: "Your payment method was declined by the payment method provider.", status: "declined" as const },
    { message: "The payment failed due to a timeout.", status: "declined" as const },
    { message: "Your BLIK code is incorrect. Please check the code in your banking app and try again.", status: "declined" as const },
  ])("shows Stripe's reason $message and asks for a new code from the banking app", async (outcome) => {
    selectedPaymentMethod.type = "blik"

    await payForTheSessionOnScreen(outcome)

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith(outcome.message, {
        description: "Generate a new BLIK code in your banking app and enter it to try again.",
      })
    })
    expect(resetCheckoutSession).not.toHaveBeenCalled()
  })

  it("asks for a new code when Stripe.js stops a BLIK attempt on a session that stays open", async () => {
    selectedPaymentMethod.type = "blik"
    readStatus.mockResolvedValue("open")

    await payForTheSessionOnScreen({ message: "", status: "failed" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith("Payment failed. Please try again.", {
        description: "Generate a new BLIK code in your banking app and enter it to try again.",
      })
    })
  })
})

describe("PaymentStep when Stripe declines the payment", () => {
  it("shows Stripe's reason and keeps the payment form without asking for the session's state", async () => {
    await payForTheSessionOnScreen({ message: "Your card was declined.", status: "declined" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith("Your card was declined.")
    })
    expect(readStatus).not.toHaveBeenCalled()
    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(paymentElementMounts.count).toBe(1)
  })

  it("uses the generic payment copy when the decline carries no message", async () => {
    await payForTheSessionOnScreen({ message: "", status: "declined" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith("Payment failed. Please try again.")
    })
  })
})

describe("PaymentStep when Stripe.js stops a payment attempt on a session that is still open", () => {
  it.each([
    "Your card number is incomplete.",
    "Your BLIK code is invalid",
    "We are unable to authenticate your payment method. Please choose a different payment method and try again.",
  ])("shows %j and keeps the session and the details the shopper entered", async (message) => {
    readStatus.mockResolvedValue("open")
    await payForTheSessionOnScreen({ message, status: "failed" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith(message)
    })
    expect(readStatus).toHaveBeenCalledExactlyOnceWith("cs_test_1")
    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(paymentElementMounts.count).toBe(1)
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: PAY_BUTTON })).toBeEnabled()
  })

  it("uses the generic payment copy when Stripe.js gives no message", async () => {
    readStatus.mockResolvedValue("open")
    await payForTheSessionOnScreen({ message: "", status: "failed" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith("Payment failed. Please try again.")
    })
  })

  it("shows Stripe's message and keeps the session when the session's state cannot be read", async () => {
    readStatus.mockRejectedValue(new Error("network down"))
    await payForTheSessionOnScreen({ message: "Your card number is incomplete.", status: "failed" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith("Your card number is incomplete.")
    })
    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(paymentElementMounts.count).toBe(1)
  })
})

describe("PaymentStep when a payment attempt finds its session closed", () => {
  it("opens a fresh session for the held one and says why the payment form was replaced", async () => {
    saveCheckoutSession({ lines: [{ qty: 1, variantId: "v-1" }], sessionId: "cs_test_held" })
    readStatus.mockResolvedValue("closed")
    await payForTheSessionOnScreen({ message: NOT_ACTIVE, status: "failed" })

    await waitFor(() => {
      expect(setCheckoutSession).toHaveBeenCalledExactlyOnceWith(replacement)
    })
    expect(resetCheckoutSession).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ heldSessionId: "cs_test_held", session }))
    expect(toastError).toHaveBeenCalledExactlyOnceWith(SESSION_REPLACED)
  })

  it("reports the mapped error when the fresh session cannot be opened", async () => {
    readStatus.mockResolvedValue("closed")
    resetCheckoutSession.mockRejectedValue(new Error("INSUFFICIENT_INVENTORY"))
    await payForTheSessionOnScreen({ message: NOT_ACTIVE, status: "failed" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Some items in your cart are out of stock.")
    })
    expect(toastError).not.toHaveBeenCalledWith(SESSION_REPLACED)
    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
