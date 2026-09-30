import { cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"

import { CartAvailabilityBanner } from "~/src/presentation/components/custom/cart-availability-banner"

const { getAvailabilityByVariantIds } = vi.hoisted(() => ({
  getAvailabilityByVariantIds: vi.fn<(variantIds: readonly string[]) => Promise<Map<string, number>>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/better-auth/auth.middleware", async () => {
  const { createMiddleware } = await import("@tanstack/react-start")

  return { withRequest: createMiddleware({ type: "function" }).server(({ next }) => next()) }
})
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ getAvailabilityByVariantIds }))

const BANNER_TEXT = "Some items in your cart are no longer available. Update your cart before checkout."

const cartItem = (variantId: string, qty: number): CartItem => ({
  id: variantId,
  image: "/ring.avif",
  price: "199,00 zł",
  qty,
  rawPrice: 19_900,
  slug: "silver-ring",
  title: "Silver Ring",
  variantId,
  variantTitle: "One size",
})

beforeEach(() => {
  getAvailabilityByVariantIds.mockReset()
  useCartStore.setState({ items: [] })
})

afterEach(() => {
  cleanup()
})

describe("CartAvailabilityBanner", () => {
  it("stays hidden for an empty cart", () => {
    const { container } = renderWithProviders(<CartAvailabilityBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it("stays hidden while the availability check is still running", () => {
    useCartStore.setState({ items: [cartItem("var_1", 3)] })
    getAvailabilityByVariantIds.mockResolvedValue(new Map([["var_1", 1]]))
    const { container } = renderWithProviders(<CartAvailabilityBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it("stays hidden once every line is confirmed available", async () => {
    useCartStore.setState({ items: [cartItem("var_1", 1)] })
    getAvailabilityByVariantIds.mockResolvedValue(new Map([["var_1", 9]]))
    const { container } = renderWithProviders(<CartAvailabilityBanner />)

    await waitFor(() => {
      expect(getAvailabilityByVariantIds).toHaveBeenCalled()
    })

    expect(container).toBeEmptyDOMElement()
  })

  it("warns the shopper once a line is short-stocked", async () => {
    useCartStore.setState({ items: [cartItem("var_1", 3)] })
    getAvailabilityByVariantIds.mockResolvedValue(new Map([["var_1", 1]]))
    renderWithProviders(<CartAvailabilityBanner />)

    expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument()
  })

  it("announces the warning politely to assistive technology", async () => {
    useCartStore.setState({ items: [cartItem("var_1", 3)] })
    getAvailabilityByVariantIds.mockResolvedValue(new Map([["var_1", 1]]))
    renderWithProviders(<CartAvailabilityBanner />)
    const alert = await screen.findByRole("alert")

    expect(alert).toHaveAttribute("aria-live", "polite")
    expect(alert.textContent).toBe(BANNER_TEXT)
  })
})
