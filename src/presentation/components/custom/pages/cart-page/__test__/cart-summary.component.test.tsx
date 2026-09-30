import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CartSummary } from "~/src/presentation/components/custom/pages/cart-page/cart-summary"

afterEach(() => {
  cleanup()
})

describe("CartSummary", () => {
  it("shows the subtotal it was handed as both subtotal and total", () => {
    renderWithProviders(<CartSummary subtotal="PLN 340.00" />)

    expect(screen.getByText("Subtotal")).toBeInTheDocument()
    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getAllByText("PLN 340.00")).toHaveLength(2)
  })

  it("defers shipping to the checkout step instead of pricing it here", () => {
    renderWithProviders(<CartSummary subtotal="PLN 340.00" />)

    expect(screen.getByText("Calculated at checkout")).toBeInTheDocument()
    expect(screen.getByText("Shipping & taxes calculated at checkout.")).toBeInTheDocument()
  })

  it("offers a checkout link by default", () => {
    renderWithProviders(<CartSummary subtotal="PLN 340.00" />)

    const checkout = screen.getByRole("link", { name: "Proceed to Checkout" })

    expect(checkout).toHaveAttribute("href", expect.stringContaining("checkout"))
  })

  it("replaces the checkout link with a disabled label when checkout is blocked", () => {
    renderWithProviders(<CartSummary checkoutDisabled subtotal="PLN 340.00" />)

    expect(screen.queryByRole("link", { name: "Proceed to Checkout" })).not.toBeInTheDocument()

    const blocked = screen.getByText("Proceed to Checkout")

    expect(blocked).toHaveAttribute("aria-disabled", "true")
    expect(blocked).toHaveClass("cursor-not-allowed")
  })

  it("keeps the payment and returns reassurance visible either way", () => {
    renderWithProviders(<CartSummary checkoutDisabled subtotal="PLN 0.00" />)

    expect(screen.getByText("Secure payment")).toBeInTheDocument()
    expect(screen.getByText("14-day right of withdrawal")).toBeInTheDocument()
  })
})
