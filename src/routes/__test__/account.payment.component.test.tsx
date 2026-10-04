import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"
import { type Payment } from "~/src/modules/payment/payment.types"

const calls = vi.hoisted(() => ({
  createSetupIntent: vi.fn<() => Promise<{ clientSecret: string }>>(),
  deleteSavedPaymentMethod: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  toastError: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: vi.fn() } }))
vi.mock("~/src/modules/payment/use-cases/delete-saved-payment-method", () => ({
  deleteSavedPaymentMethodMutation: { mutationFn: calls.deleteSavedPaymentMethod, mutationKey: ["payment", "deleteSavedMethod"] },
}))
vi.mock("~/src/modules/payment/use-cases/create-card-setup-intent", () => ({
  createCardSetupIntentMutation: { mutationFn: calls.createSetupIntent, mutationKey: ["payment", "createSetupIntent"] },
}))
vi.mock("~/src/presentation/components/custom/pages/account/payment/add-card-form.client", () => ({
  AddCardForm: ({
    clientSecret,
    onCancel,
    onSetupEnded,
  }: Readonly<{ clientSecret: string; onCancel: () => void; onSetupEnded: () => void }>): JSX.Element => (
    <form aria-label="New card">
      <output>{clientSecret}</output>
      <button onClick={onCancel} type="button">
        Close the card form
      </button>
      <button onClick={onSetupEnded} type="button">
        End the setup intent
      </button>
    </form>
  ),
}))
vi.mock("~/src/modules/payment/use-cases/list-saved-payment-methods", () => ({
  listSavedPaymentMethodsQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["payment", "savedMethods"] }),
}))

import { Route } from "~/src/routes/account.payment"

const VISA: Payment["savedMethod"] = {
  brand: "visa",
  expMonth: 4,
  expYear: 2030,
  id: "pm_visa",
  isExpired: false,
  last4: "4242",
}

const EXPIRED_MASTERCARD: Payment["savedMethod"] = {
  brand: "mastercard",
  expMonth: 11,
  expYear: 2024,
  id: "pm_mastercard",
  isExpired: true,
  last4: "4444",
}

const PaymentPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the account payment route registered no component")
  }

  return <Page />
}

const renderPayment = (methods: readonly Payment["savedMethod"][]) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(PAYMENT_METHOD_QUERY_KEYS.SAVED, methods)

  return renderWithProviders(<PaymentPage />, { queryClient })
}

const addCardButton = (): HTMLElement => screen.getByRole("button", { name: "Add Card" })

const cardForm = (): HTMLElement | null => screen.queryByRole("form", { name: "New card" })

const isHeld = (button: HTMLElement): boolean => button.getAttribute("aria-disabled") === "true"

beforeEach(() => {
  vi.clearAllMocks()
  calls.createSetupIntent
    .mockReset()
    .mockResolvedValueOnce({ clientSecret: "seti_1_secret_a" })
    .mockResolvedValueOnce({ clientSecret: "seti_2_secret_b" })
})

afterEach(cleanup)

describe("account payment page", () => {
  it("titles the wallet page", () => {
    renderPayment([])

    expect(screen.getByText("Wallet")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Payment Methods" })).toBeInTheDocument()
  })

  it("counts the cards the customer has actually saved", () => {
    renderPayment([VISA, EXPIRED_MASTERCARD])

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Saved Cards (2)")
  })

  it("names each card by its brand and last four digits", () => {
    renderPayment([VISA])

    expect(screen.getByText("visa •••• 4242")).toBeInTheDocument()
    expect(screen.getByText("Expires 04/2030")).toBeInTheDocument()
  })

  it("flags a card the customer can no longer pay with", () => {
    renderPayment([EXPIRED_MASTERCARD])

    expect(screen.getByText("Expired")).toBeInTheDocument()
  })

  it("leaves a usable card unflagged", () => {
    renderPayment([VISA])

    expect(screen.queryByText("Expired")).toBeNull()
  })

  it("offers to remove every saved card", () => {
    renderPayment([VISA, EXPIRED_MASTERCARD])

    expect(screen.getAllByRole("button", { name: "Remove card" })).toHaveLength(2)
  })

  it("explains the empty wallet rather than counting a card that is not there", () => {
    renderPayment([])

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Saved Cards (0)")
    expect(screen.getByText("No saved cards yet. Add one here, or save your card the next time you pay.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remove card" })).toBeNull()
  })

  it("keeps the security note on the page", () => {
    renderPayment([])

    expect(screen.getByText("Security")).toBeInTheDocument()
    expect(
      screen.getByText("Cards are stored by Stripe, never on our servers. We only keep a reference so you can reuse them."),
    ).toBeInTheDocument()
  })
})

describe("adding a card from the wallet", () => {
  it("offers to add a card even before any card is saved", () => {
    renderPayment([])

    expect(isHeld(addCardButton())).toBe(false)
    expect(cardForm()).toBeNull()
  })

  it("opens the card form for the setup intent the server created", async () => {
    renderPayment([])

    await userEvent.click(addCardButton())

    expect(await screen.findByRole("form", { name: "New card" })).toHaveTextContent("seti_1_secret_a")
    expect(calls.createSetupIntent).toHaveBeenCalledOnce()
    expect(isHeld(addCardButton())).toBe(true)
  })

  it("holds the button while the setup intent is being created without taking focus away from it", async () => {
    calls.createSetupIntent.mockReset().mockReturnValue(new Promise(() => {}))
    renderPayment([])

    await userEvent.click(addCardButton())

    await waitFor(() => {
      expect(isHeld(addCardButton())).toBe(true)
    })
    expect(addCardButton()).toHaveFocus()
    expect(cardForm()).toBeNull()
  })

  it("does not open a second setup intent when the held button is clicked again", async () => {
    calls.createSetupIntent.mockReset().mockReturnValue(new Promise(() => {}))
    renderPayment([])

    await userEvent.click(addCardButton())
    await waitFor(() => {
      expect(isHeld(addCardButton())).toBe(true)
    })
    await userEvent.click(addCardButton())

    expect(calls.createSetupIntent).toHaveBeenCalledOnce()
  })

  it("says the card form could not be opened, without claiming a card was rejected", async () => {
    calls.createSetupIntent.mockReset().mockRejectedValue(new Error("too many requests"))
    renderPayment([])

    await userEvent.click(addCardButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("The card form could not load. Please try again in a moment.")
    })
    expect(cardForm()).toBeNull()
    expect(isHeld(addCardButton())).toBe(false)
  })

  it("reopens the same setup intent after the shopper closes the form", async () => {
    renderPayment([])
    await userEvent.click(addCardButton())
    await userEvent.click(await screen.findByRole("button", { name: "Close the card form" }))

    expect(cardForm()).toBeNull()

    await userEvent.click(addCardButton())

    expect(await screen.findByRole("form", { name: "New card" })).toHaveTextContent("seti_1_secret_a")
    expect(calls.createSetupIntent).toHaveBeenCalledOnce()
  })

  it.each(["Close the card form", "End the setup intent"])("hands focus back to Add Card after %s", async (closer) => {
    renderPayment([])
    await userEvent.click(addCardButton())
    await userEvent.click(await screen.findByRole("button", { name: closer }))

    expect(cardForm()).toBeNull()
    expect(addCardButton()).toHaveFocus()
  })

  it("starts a fresh setup intent once the form reports the last one saved a card or can no longer be used", async () => {
    renderPayment([])
    await userEvent.click(addCardButton())
    await userEvent.click(await screen.findByRole("button", { name: "End the setup intent" }))

    expect(cardForm()).toBeNull()

    await userEvent.click(addCardButton())

    expect(await screen.findByRole("form", { name: "New card" })).toHaveTextContent("seti_2_secret_b")
    expect(calls.createSetupIntent).toHaveBeenCalledTimes(2)
  })
})
