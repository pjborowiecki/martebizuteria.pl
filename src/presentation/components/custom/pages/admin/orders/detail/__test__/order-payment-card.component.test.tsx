import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderPaymentCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-payment-card"

const order = buildAdminOrderDetail()

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
