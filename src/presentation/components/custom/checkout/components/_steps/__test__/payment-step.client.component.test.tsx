import { type JSX, type ReactNode, useEffect } from "react"

import { type StripeCheckoutElementsSdkOptions } from "@stripe/stripe-js"
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
  amount: number
  existing: CheckoutSession | undefined
  items: readonly { qty: number; variantId: string }[]
  values: CheckoutFormSchema
}

interface NavigateOptions {
  search: (prev: Readonly<Record<string, unknown>>) => Record<string, unknown>
  to: string
}

const {
  confirmCheckoutSession,
  deliveryMethods,
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
  deliveryMethods: { current: [{ id: "courier", name: "Courier", price: 1500 }] },
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
vi.mock("~/src/modules/delivery-method/use-cases/list-delivery-methods", () => ({
  listDeliveryMethodsQuery: () => ({
    queryFn: () => Promise.resolve(deliveryMethods.current),
    queryKey: ["delivery-method", "all"],
  }),
}))
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
    elementsStatus.current === "success" ? { checkout: { id: "checkout-object" }, type: "success" } : { type: elementsStatus.current },
}))

import { buildCheckoutValuesFingerprint } from "~/src/integrations/stripe/stripe.checkout"

import { useCartStore } from "~/src/modules/cart/cart.store"

import { PaymentStep } from "~/src/presentation/components/custom/checkout/components/_steps/payment-step.client"

const PAY_BUTTON = "Order & Pay"

const session: CheckoutSession = {
  amount: 21_500,
  clientSecret: "cs_test_secret",
  linesFingerprint: "v-1:1",
  sessionId: "cs_test_1",
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
  deliveryMethods.current = [{ id: "courier", name: "Courier", price: 1500 }]
  formState.session = undefined
  formState.values = completeValues
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
  it("creates a session for the cart total plus the selected delivery price", async () => {
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    })

    expect(ensureCheckoutSession.mock.calls[0]?.[0].amount).toBe(21_500)
    expect(ensureCheckoutSession.mock.calls[0]?.[0].existing).toBeUndefined()
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

  it("does not open a session when the payable amount is zero", async () => {
    useCartStore.setState({ items: [] })
    deliveryMethods.current = [{ id: "courier", name: "Atelier pickup", price: 0 }]
    const { queryClient } = renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(queryClient.getQueryData(["delivery-method", "all"])).toBeDefined()
    })

    expect(ensureCheckoutSession).not.toHaveBeenCalled()
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument()
  })

  it("reuses an existing session whose amount and lines still match", async () => {
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
  ])("refreshes the saved session when checkout details change at the same total: %j", async (changes) => {
    formState.session = session
    formState.values = { ...completeValues, ...changes }
    deliveryMethods.current.push({ id: "other-courier", name: "Other courier", price: 1500 })
    const updatedSession = { ...session, valuesFingerprint: buildCheckoutValuesFingerprint(formState.values) }
    ensureCheckoutSession.mockResolvedValue(updatedSession)
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledWith({
        amount: session.amount,
        existing: session,
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

  it("falls back to the unknown-error copy for an unrecognised failure", async () => {
    ensureCheckoutSession.mockRejectedValue(new Error("boom"))
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Something went wrong. Please try again.")
    })
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
  it("labels the submit button with the place-order copy once the element is ready", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(payButton()).toBeEnabled()
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
  it("confirms the session and moves to the success view when payment succeeds", async () => {
    formState.session = session
    renderWithProviders(<PaymentStep />)
    await clickPay()

    await waitFor(() => {
      expect(confirmCheckoutSession).toHaveBeenCalledTimes(1)
    })

    expect(navigate).toHaveBeenCalledTimes(1)
    const options = navigate.mock.calls[0]?.[0]

    expect(options?.to).toBe(".")
    expect(options?.search({ step: 4 })).toStrictEqual({ step: 4, success: true })
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

  it("keeps the submit button disabled while Stripe is still loading the checkout object", async () => {
    formState.session = session
    elementsStatus.current = "loading"
    renderWithProviders(<PaymentStep />)

    await waitFor(() => {
      expect(screen.getByTestId("payment-element")).toBeInTheDocument()
    })

    expect(payButton()).toBeDisabled()
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
  const { queryClient } = renderWithProviders(<PaymentStep />)
  await clickPay()

  return { confirmation, queryClient, replacement }
}

describe("PaymentStep confirmation races", () => {
  it("keeps an in-flight replacement when the previous confirmation requests a session reset", async () => {
    const { confirmation, queryClient, replacement } = await renderWithPendingConfirmation()
    expect(confirmCheckoutSession).toHaveBeenCalledTimes(1)

    deliveryMethods.current = [{ id: "courier", name: "Courier", price: 2000 }]
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["delivery-method", "all"] })
    })
    await waitFor(() => {
      expect(ensureCheckoutSession).toHaveBeenCalledTimes(1)
    })
    expect(ensureCheckoutSession.mock.calls[0]?.[0]).toMatchObject({ amount: 22_000, existing: session })
    expect(screen.queryByRole("button", { name: PAY_BUTTON })).not.toBeInTheDocument()

    await act(async () => {
      confirmation.resolve({ message: "expired", recoverable: true, status: "error" })
      await confirmation.promise
    })

    expect(resetCheckoutSession).not.toHaveBeenCalled()
    expect(setCheckoutSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    const replacementSession = { ...refreshedSession, amount: 22_000, clientSecret: "replacement-secret" }
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
