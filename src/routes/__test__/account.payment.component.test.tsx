import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/account.payment"

const renderPayment = () => {
  const PaymentPage = Route.options.component
  if (PaymentPage === undefined) {
    throw new Error("the account payment route registered no component")
  }

  return renderWithProviders(<PaymentPage />)
}

afterEach(cleanup)

describe("account payment page", () => {
  it("titles the wallet page", () => {
    renderPayment()

    expect(screen.getByText("Wallet")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Payment Methods" })).toBeInTheDocument()
  })

  it("counts the saved cards as none", () => {
    renderPayment()

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Saved Cards (0)")
  })

  it("explains that cards are entered at checkout instead of being stored", () => {
    renderPayment()

    expect(screen.getByText("No saved payment methods. Cards are entered securely at checkout.")).toBeInTheDocument()
  })

  it("keeps the security note on the page", () => {
    renderPayment()

    expect(screen.getByText("Security")).toBeInTheDocument()
    expect(
      screen.getByText("Your payment information is securely encrypted. We do not store full credit card numbers on our servers."),
    ).toBeInTheDocument()
  })

  it("offers nothing to click while no card can be saved", () => {
    renderPayment()

    expect(screen.queryByRole("button")).toBeNull()
  })
})
