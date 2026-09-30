import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductMobileBuyBar } from "~/src/presentation/components/custom/pages/product-page/product-mobile-buy-bar"

describe("ProductMobileBuyBar", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the formatted price beside the call to action", () => {
    renderWithProviders(<ProductMobileBuyBar canPurchase isAdded={false} onAddToCart={vi.fn<() => void>()} price="1 299,00 zl" />)

    expect(screen.getByText("1 299,00 zl")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeEnabled()
  })

  it("confirms the item is in the cart after it was added", () => {
    renderWithProviders(<ProductMobileBuyBar canPurchase isAdded onAddToCart={vi.fn<() => void>()} price="1 299,00 zl" />)

    expect(screen.getByRole("button", { name: "Added to Cart" })).toBeInTheDocument()
  })

  it("disables the call to action when the variant cannot be bought", () => {
    renderWithProviders(<ProductMobileBuyBar canPurchase={false} isAdded={false} onAddToCart={vi.fn<() => void>()} price="1 299,00 zl" />)

    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled()
  })

  it("adds to the cart when the shopper taps the button", async () => {
    const onAddToCart = vi.fn<() => void>()
    renderWithProviders(<ProductMobileBuyBar canPurchase isAdded={false} onAddToCart={onAddToCart} price="1 299,00 zl" />)

    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))

    expect(onAddToCart).toHaveBeenCalledTimes(1)
  })

  it("cannot be tapped while the variant is unavailable", async () => {
    const onAddToCart = vi.fn<() => void>()
    renderWithProviders(<ProductMobileBuyBar canPurchase={false} isAdded={false} onAddToCart={onAddToCart} price="1 299,00 zl" />)

    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }))

    expect(onAddToCart).not.toHaveBeenCalled()
  })
})
