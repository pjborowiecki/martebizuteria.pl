import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_ORDER } from "~/src/data/order-detail"

import { OrderPaymentCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-payment-card"

afterEach(() => {
  cleanup()
})

describe("OrderPaymentCard", () => {
  it("titles the card with the payment heading", () => {
    renderWithProviders(<OrderPaymentCard />)

    expect(screen.getByText("Payment")).toBeInTheDocument()
  })

  it("shows the masked card and the transaction reference", () => {
    renderWithProviders(<OrderPaymentCard />)

    expect(screen.getByText(DEMO_ORDER.paymentMethod)).toBeInTheDocument()
    expect(screen.getByText(DEMO_ORDER.transactionId)).toBeInTheDocument()
  })

  it("offers a single copy action for the transaction id", () => {
    renderWithProviders(<OrderPaymentCard />)

    expect(screen.getAllByRole("button")).toHaveLength(1)
  })

  it("renders the transaction id in a monospaced run so it can be read digit by digit", () => {
    renderWithProviders(<OrderPaymentCard />)

    expect(screen.getByText(DEMO_ORDER.transactionId).className).toContain("font-mono")
  })
})
