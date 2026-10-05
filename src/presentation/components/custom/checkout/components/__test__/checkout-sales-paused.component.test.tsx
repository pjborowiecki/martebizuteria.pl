import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CheckoutSalesPaused } from "~/src/presentation/components/custom/checkout/components/checkout-sales-paused"

afterEach(cleanup)

describe("CheckoutSalesPaused", () => {
  it("tells the shopper why they cannot pay and that their cart is kept", () => {
    renderWithProviders(<CheckoutSalesPaused />)

    expect(screen.getByRole("heading", { name: "Orders are paused" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "We have stopped taking orders for a while, so checkout is closed. Your cart will wait here, and you can place your order as soon as we reopen.",
    )
  })

  it("leads back to the cart", () => {
    renderWithProviders(<CheckoutSalesPaused />)

    expect(screen.getByRole("link", { name: "Back to cart" })).toHaveAttribute("href", "/cart")
  })
})
