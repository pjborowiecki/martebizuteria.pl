import { type JSX, useEffect } from "react"

import { type StripePaymentElementOptions } from "@stripe/stripe-js"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"

interface SetupOutcome {
  readonly error?: { readonly message?: string; readonly type: string }
  readonly setupIntent?: { readonly payment_method: string | { readonly id: string } | null; readonly status: string }
}

const stripe = vi.hoisted(() => ({
  confirmSetup: vi.fn<(options: object) => Promise<SetupOutcome>>(),
  elementState: { current: "ready" },
  elements: { kind: "elements" },
  focusCardField: vi.fn<() => void>(),
  hasElements: { current: true },
  hasStripe: { current: true },
  paymentElementOptions: { current: undefined as StripePaymentElementOptions | undefined },
  removeDuplicates: vi.fn<(input: { paymentMethodId: string }) => Promise<{ removed: number }>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: stripe.toastError, success: stripe.toastSuccess } }))
vi.mock("~/src/modules/payment/use-cases/remove-duplicate-saved-cards", () => ({
  removeDuplicateSavedCardsMutation: { mutationFn: stripe.removeDuplicates, mutationKey: ["payment", "removeDuplicateSavedCards"] },
}))
vi.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: ({
    onLoadError,
    onReady,
    options,
  }: Readonly<{
    onLoadError: () => void
    onReady: (element: { focus: () => void }) => void
    options: StripePaymentElementOptions
  }>): JSX.Element => {
    stripe.paymentElementOptions.current = options
    useEffect(() => {
      if (stripe.elementState.current === "ready") {
        onReady({ focus: stripe.focusCardField })
      }
      if (stripe.elementState.current === "failed") {
        onLoadError()
      }
    }, [onLoadError, onReady])

    return <div data-testid="payment-element" />
  },
  useElements: () => (stripe.hasElements.current ? stripe.elements : null),
  useStripe: () => (stripe.hasStripe.current ? { confirmSetup: stripe.confirmSetup } : null),
}))

import { AddCardFields } from "~/src/presentation/components/custom/pages/account/payment/add-card-fields.client"

const onCancel = vi.fn<() => void>()

const onFailed = vi.fn<() => void>()

const onSaved = vi.fn<() => void>()

const renderFields = () => {
  const rendered = renderWithProviders(<AddCardFields onCancel={onCancel} onFailed={onFailed} onSaved={onSaved} />)

  return { ...rendered, invalidateQueries: vi.spyOn(rendered.queryClient, "invalidateQueries") }
}

const saveButton = (): HTMLElement => screen.getByRole("button", { name: "Save Card" })

const submitWithEnter = async (): Promise<void> => {
  fireEvent.submit(screen.getByRole("form", { name: "Add Card" }))
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stripe.elementState.current = "ready"
  stripe.hasElements.current = true
  stripe.hasStripe.current = true
  stripe.paymentElementOptions.current = undefined
  stripe.confirmSetup.mockReset().mockResolvedValue({ setupIntent: { payment_method: "pm_new", status: "succeeded" } })
  stripe.removeDuplicates.mockReset().mockResolvedValue({ removed: 0 })
})

afterEach(cleanup)

describe("AddCardFields", () => {
  it("keeps the card form free of wallets and Link, like checkout", () => {
    renderFields()

    expect(stripe.paymentElementOptions.current).toStrictEqual({ wallets: { applePay: "never", googlePay: "never", link: "never" } })
  })

  it("tells the shopper they will not be charged for saving a card", () => {
    renderFields()

    expect(screen.getByText("Your bank may ask you to confirm the card. You will not be charged.")).toBeInTheDocument()
  })

  it("moves focus into Stripe's card fields as soon as they are ready", () => {
    renderFields()

    expect(stripe.focusCardField).toHaveBeenCalledOnce()
    expect(saveButton()).toBeEnabled()
  })

  it("keeps the save button disabled until Stripe's card fields are ready", () => {
    stripe.elementState.current = "loading"
    renderFields()

    expect(saveButton()).toBeDisabled()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("ignores Enter in the card fields until they are ready", async () => {
    stripe.elementState.current = "loading"
    renderFields()

    await submitWithEnter()

    expect(stripe.confirmSetup).not.toHaveBeenCalled()
  })

  it("explains that the card form could not load instead of waiting forever", () => {
    stripe.elementState.current = "failed"
    renderFields()

    expect(screen.getByRole("alert")).toHaveTextContent("The card form could not load. Please try again in a moment.")
    expect(saveButton()).toBeDisabled()
  })

  it.each([
    ["Stripe.js", stripe.hasStripe],
    ["the Elements group", stripe.hasElements],
  ])("does not confirm before %s has loaded", async (_dependency, availability) => {
    availability.current = false
    renderFields()

    await submitWithEnter()

    expect(stripe.confirmSetup).not.toHaveBeenCalled()
  })

  it("closes the form without saving when the shopper cancels", async () => {
    renderFields()

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(stripe.confirmSetup).not.toHaveBeenCalled()
  })
})

describe("saving a card", () => {
  it("confirms the card on the page and lets checkout offer it again", async () => {
    renderFields()

    await userEvent.click(saveButton())

    expect(stripe.confirmSetup).toHaveBeenCalledExactlyOnceWith({
      confirmParams: { payment_method_data: { allow_redisplay: "always" } },
      elements: stripe.elements,
      redirect: "if_required",
    })
  })

  it("drops older copies of the same card, then reloads the saved cards, confirms and closes", async () => {
    const { invalidateQueries } = renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce()
    })
    expect(stripe.removeDuplicates).toHaveBeenCalledExactlyOnceWith({ paymentMethodId: "pm_new" }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
    expect(stripe.toastSuccess).toHaveBeenCalledWith("Card saved")
    expect(onFailed).not.toHaveBeenCalled()
  })

  it("reads the saved card from an expanded payment method too", async () => {
    stripe.confirmSetup.mockResolvedValue({ setupIntent: { payment_method: { id: "pm_expanded" }, status: "succeeded" } })
    renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce()
    })
    expect(stripe.removeDuplicates).toHaveBeenCalledWith({ paymentMethodId: "pm_expanded" }, expect.anything())
  })

  it("still reports the card as saved when the older copies cannot be removed", async () => {
    stripe.removeDuplicates.mockRejectedValue(new Error("too many requests"))
    const { invalidateQueries } = renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce()
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
    expect(stripe.toastSuccess).toHaveBeenCalledWith("Card saved")
    expect(stripe.toastError).not.toHaveBeenCalled()
  })

  it("finishes without looking for copies when Stripe names no saved card", async () => {
    stripe.confirmSetup.mockResolvedValue({ setupIntent: { payment_method: null, status: "succeeded" } })
    renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce()
    })
    expect(stripe.removeDuplicates).not.toHaveBeenCalled()
  })

  it("shows progress and blocks a second submission while the card is being confirmed", async () => {
    stripe.confirmSetup.mockReturnValue(new Promise(() => {}))
    renderFields()

    await userEvent.click(saveButton())

    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    await submitWithEnter()
    expect(stripe.confirmSetup).toHaveBeenCalledOnce()
  })

  it("keeps the form busy until the older copies are dealt with", async () => {
    stripe.removeDuplicates.mockReturnValue(new Promise(() => {}))
    renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(stripe.removeDuplicates).toHaveBeenCalledOnce()
    })
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
    await submitWithEnter()
    expect(stripe.confirmSetup).toHaveBeenCalledOnce()
    expect(onSaved).not.toHaveBeenCalled()
  })
})

describe("when saving a card fails", () => {
  it.each([
    ["the bank's reason for a declined card", { message: "Your card was declined.", type: "card_error" }, "Your card was declined."],
    [
      "Stripe's message for card details it rejected",
      { message: "Your card number is incomplete.", type: "validation_error" },
      "Your card number is incomplete.",
    ],
    ["the shop's own message for a card error without one", { type: "card_error" }, "We could not save that card. Please try again."],
  ])("shows %s and keeps the form open on the same setup intent", async (_case, error, message) => {
    stripe.confirmSetup.mockResolvedValue({ error })
    const { invalidateQueries } = renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(stripe.toastError).toHaveBeenCalledWith(message)
    })
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(onFailed).not.toHaveBeenCalled()
    expect(saveButton()).toBeEnabled()
  })

  it("gives up on a setup intent Stripe can no longer confirm and rereads the saved cards", async () => {
    stripe.confirmSetup.mockResolvedValue({ error: { message: "This SetupIntent has already succeeded.", type: "invalid_request_error" } })
    const { invalidateQueries } = renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(onFailed).toHaveBeenCalledOnce()
    })
    expect(stripe.toastError).toHaveBeenCalledWith("We could not save that card. Please try again.")
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
    expect(onSaved).not.toHaveBeenCalled()
  })

  it("gives up on the setup intent when Stripe.js could not confirm the card at all", async () => {
    stripe.confirmSetup.mockRejectedValue(new Error("network down"))
    const { invalidateQueries } = renderFields()

    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(onFailed).toHaveBeenCalledOnce()
    })
    expect(stripe.toastError).toHaveBeenCalledWith("We could not save that card. Please try again.")
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
    expect(onSaved).not.toHaveBeenCalled()
  })
})
