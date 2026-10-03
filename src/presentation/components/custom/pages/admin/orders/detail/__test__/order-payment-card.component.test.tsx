import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const spies = vi.hoisted(() => ({
  toastSuccess: vi.fn<(message: string) => void>(),
  writeText: vi.fn<(text: string) => Promise<void>>(() => Promise.resolve()),
}))

vi.mock("sonner", () => ({ toast: { success: spies.toastSuccess } }))

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderPaymentCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-payment-card"

const order = buildAdminOrderDetail()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: spies.writeText }, writable: true })
})

afterEach(() => {
  cleanup()
})

describe("OrderPaymentCard", () => {
  it("shows the provider, amount and transaction id", () => {
    renderWithProviders(<OrderPaymentCard currencyCode={order.currencyCode} payment={order.payment} />)

    expect(screen.getByText("Payment")).toBeInTheDocument()
    expect(screen.getByText("stripe")).toBeInTheDocument()
    expect(screen.getByText("pi_3Ns8wK2eZvKY")).toBeInTheDocument()
    expect(screen.getByText(/389[.,]00/u)).toBeInTheDocument()
  })

  it("offers a copy control for the transaction id", () => {
    renderWithProviders(<OrderPaymentCard currencyCode={order.currencyCode} payment={order.payment} />)

    expect(screen.getByRole("button", { name: "Copy transaction id" })).toBeInTheDocument()
  })

  it("surfaces a recorded refund", () => {
    const refunded = buildAdminOrderDetail({
      payment: {
        amountMinorUnits: 38_900,
        provider: "stripe",
        refundedAmountMinorUnits: 38_900,
        refundedAt: new Date("2026-03-10T10:00:00.000Z"),
        status: "refunded",
        transactionId: "pi_3Ns8wK2eZvKY",
      },
    })
    renderWithProviders(<OrderPaymentCard currencyCode={refunded.currencyCode} payment={refunded.payment} />)

    expect(screen.getByText(/Refunded/u)).toBeInTheDocument()
    expect(screen.getByText(/^−/u)).toBeInTheDocument()
  })

  it("states when no payment was recorded", () => {
    renderWithProviders(<OrderPaymentCard currencyCode={order.currencyCode} payment={undefined} />)

    expect(screen.getByText("No payment recorded for this order.")).toBeInTheDocument()
  })
})

describe("OrderPaymentCard transaction id", () => {
  it("copies the transaction id to the clipboard and confirms it", async () => {
    renderWithProviders(<OrderPaymentCard currencyCode={order.currencyCode} payment={order.payment} />)

    await userEvent.click(screen.getByRole("button", { name: "Copy transaction id" }))

    expect(spies.writeText).toHaveBeenCalledExactlyOnceWith("pi_3Ns8wK2eZvKY")
    expect(spies.toastSuccess).toHaveBeenCalledExactlyOnceWith("Transaction id copied")
  })

  it("offers nothing to copy for a payment without a transaction id", () => {
    const pending = buildAdminOrderDetail({
      payment: {
        amountMinorUnits: 38_900,
        provider: "stripe",
        refundedAmountMinorUnits: 0,
        refundedAt: undefined,
        status: "pending",
        transactionId: undefined,
      },
    })
    renderWithProviders(<OrderPaymentCard currencyCode={pending.currencyCode} payment={pending.payment} />)

    expect(screen.queryByRole("button", { name: "Copy transaction id" })).toBeNull()
    expect(screen.queryByText("#")).toBeNull()
  })
})

const refundedPayment = (refundedAt: Date | undefined) =>
  buildAdminOrderDetail({
    payment: {
      amountMinorUnits: 38_900,
      provider: "stripe",
      refundedAmountMinorUnits: 10_000,
      refundedAt,
      status: "succeeded",
      transactionId: "pi_3Ns8wK2eZvKY",
    },
  }).payment

describe("OrderPaymentCard refund", () => {
  it("dates a refund and shows the amount returned", () => {
    renderWithProviders(<OrderPaymentCard currencyCode="PLN" payment={refundedPayment(new Date("2026-03-10T10:00:00.000Z"))} />)

    expect(screen.getByText("Refunded · Mar 10, 2026")).toBeInTheDocument()
    expect(screen.getByText(/^−/u)).toHaveTextContent(/100[.,]00/u)
  })

  it("shows a refund whose date was not recorded without a date", () => {
    renderWithProviders(<OrderPaymentCard currencyCode="PLN" payment={refundedPayment(undefined)} />)

    expect(screen.getByText("Refunded")).toHaveTextContent(/^Refunded$/u)
  })

  it("shows no refund row for a payment that was never refunded", () => {
    renderWithProviders(<OrderPaymentCard currencyCode={order.currencyCode} payment={order.payment} />)

    expect(screen.queryByText(/Refunded/u)).toBeNull()
  })
})
