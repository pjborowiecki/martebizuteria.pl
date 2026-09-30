import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/modules/customer-activity/use-cases/record-customer-activity", () => ({ recordCustomerActivity: vi.fn() }))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY } from "~/src/modules/customer-activity/customer-activity.constants"

import { CheckoutSuccess } from "~/src/presentation/components/custom/checkout/components/checkout-success"
import { loadCheckoutDraft, saveCheckoutDraft } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

beforeEach(() => {
  sessionStorage.clear()
  useCartStore.getState().addItem({
    id: "line-1",
    image: "",
    price: "249,00 zł",
    rawPrice: 24_900,
    slug: "bransoletka-aurora",
    title: "Bransoletka Aurora",
    variantId: "variant-1",
    variantTitle: "Rozmiar M",
  })
})

afterEach(() => {
  cleanup()
  useCartStore.getState().clearCart()
})

describe("CheckoutSuccess", () => {
  it("confirms the order in the shopper's language", () => {
    renderWithProviders(<CheckoutSuccess />)

    expect(screen.getByRole("heading", { name: "Order Confirmed" })).toBeInTheDocument()
    expect(screen.getByText(/Thank you for your purchase/u)).toBeInTheDocument()
  })

  it("offers a way back to the storefront", () => {
    renderWithProviders(<CheckoutSuccess />)
    const link = screen.getByRole("link", { name: "Return to store" })

    expect(link.getAttribute("href")).toBe("/")
  })

  it("empties the cart once the order is placed", () => {
    expect(useCartStore.getState().items).toHaveLength(1)

    renderWithProviders(<CheckoutSuccess />)

    expect(useCartStore.getState().items).toStrictEqual([])
    expect(useCartStore.getState().itemCount()).toBe(0)
  })

  it("discards the saved checkout draft so the next order starts clean", () => {
    saveCheckoutDraft({ city: "Warszawa", email: "anna@example.com" })
    expect(loadCheckoutDraft()).toStrictEqual({ city: "Warszawa", email: "anna@example.com" })

    renderWithProviders(<CheckoutSuccess />)

    expect(loadCheckoutDraft()).toBeUndefined()
  })

  it("resets the abandoned cart reminder so a new cart can trigger it again", () => {
    sessionStorage.setItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, "1")

    renderWithProviders(<CheckoutSuccess />)

    expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBeNull()
  })
})
