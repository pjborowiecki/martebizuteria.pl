import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"
import { type Payment } from "~/src/modules/payment/payment.types"

const deleteSavedPaymentMethod = vi.hoisted(() => vi.fn<() => Promise<void>>(() => Promise.resolve()))

vi.mock("~/src/modules/payment/use-cases/delete-saved-payment-method", () => ({
  deleteSavedPaymentMethodMutation: { mutationFn: deleteSavedPaymentMethod, mutationKey: ["payment", "deleteSavedMethod"] },
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

beforeEach(() => {
  vi.clearAllMocks()
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
    expect(screen.getByText("No saved cards yet. Choose to save your card when you pay and it will appear here.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("keeps the security note on the page", () => {
    renderPayment([])

    expect(screen.getByText("Security")).toBeInTheDocument()
    expect(
      screen.getByText("Cards are stored by Stripe, never on our servers. We only keep a reference so you can reuse them."),
    ).toBeInTheDocument()
  })
})
