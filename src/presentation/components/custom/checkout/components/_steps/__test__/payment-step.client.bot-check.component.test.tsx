import { type JSX, type ReactNode } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as StripeCheckout from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

interface SessionOpening {
  readonly requestTurnstileToken: () => Promise<string>
}

const { ensureCheckoutSession, issueTurnstileToken, navigate, onEdit, setCheckoutSession, toastError } = vi.hoisted(() => ({
  ensureCheckoutSession: vi.fn<(request: SessionOpening) => Promise<StripeCheckout.CheckoutSession>>(),
  issueTurnstileToken: vi.fn<(request: { action: string; container: HTMLElement }) => Promise<string>>(),
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
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.client", () => ({ issueTurnstileToken }))
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

import { useCartStore } from "~/src/modules/cart/cart.store"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"

const openedRequest = async (): Promise<SessionOpening> => {
  await waitFor(() => {
    expect(ensureCheckoutSession).toHaveBeenCalledOnce()
  })
  const request = ensureCheckoutSession.mock.calls[0]?.[0]
  if (request === undefined) {
    throw new Error("The payment step opened no session")
  }

  return request
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  ensureCheckoutSession.mockReturnValue(Promise.withResolvers<StripeCheckout.CheckoutSession>().promise)
  issueTurnstileToken.mockResolvedValue("turnstile-token-1")
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

describe("PaymentStep bot check", () => {
  it("runs the checkout's Turnstile check in a slot that stays on the page while the payment loads", async () => {
    const { container } = renderWithProviders(<PaymentStep />)
    const request = await openedRequest()

    await expect(request.requestTurnstileToken()).resolves.toBe("turnstile-token-1")

    const slot = issueTurnstileToken.mock.lastCall?.[0].container
    if (slot === undefined) {
      throw new Error("The payment step asked Turnstile for no token")
    }

    expect(issueTurnstileToken).toHaveBeenCalledExactlyOnceWith({ action: "checkout", container: slot })
    expect(container.contains(slot)).toBe(true)
    expect(slot).toHaveClass("empty:hidden")
  })

  it("refuses to run the check once the payment step has left the page", async () => {
    renderWithProviders(<PaymentStep />)
    const request = await openedRequest()
    cleanup()

    await expect(request.requestTurnstileToken()).rejects.toThrow("BOT_CHECK_FAILED")
    expect(issueTurnstileToken).not.toHaveBeenCalled()
  })

  it("explains a failed check and lets the shopper try again", async () => {
    ensureCheckoutSession.mockRejectedValueOnce(new Error("BOT_CHECK_FAILED"))
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith("We could not finish the check that keeps bots out of checkout. Please try again.")
    })
    await userEvent.setup().click(await screen.findByRole("button", { name: "Try again" }))

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(2)
    })
  })

  it("explains why a shopper with too many unpaid checkouts cannot open another", async () => {
    ensureCheckoutSession.mockRejectedValueOnce(new Error("TOO_MANY_OPEN_CHECKOUTS"))
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "Several payments started for this email address or from your connection have not been paid yet. Finish one of them, or try again in about half an hour, once they have expired.",
      )
    })
  })
})
