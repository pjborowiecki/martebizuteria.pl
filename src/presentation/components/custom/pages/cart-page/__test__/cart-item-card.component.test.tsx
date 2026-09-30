import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CartItem, useCartStore } from "~/src/modules/cart/cart.store"
import { type CartAvailabilityIssue } from "~/src/modules/cart/use-cases/check-cart-availability"

import { CartItemCard } from "~/src/presentation/components/custom/pages/cart-page/cart-item-card"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://cdn.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))
vi.mock("~/src/hooks/use-cart-availability", () => ({
  useCartAvailability: () => ({
    hasUnavailableItems: issuesRef.current.length > 0,
    isChecking: false,
    issues: issuesRef.current,
    issuesByVariantId: new Map(issuesRef.current.map((issue) => [issue.variantId, issue])),
  }),
}))

const issuesRef: { current: CartAvailabilityIssue[] } = { current: [] }

const cartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "line-1",
  image: "https://example.test/ring.jpg",
  price: "340.00",
  qty: 2,
  rawPrice: 34_000,
  slug: "aura-hoop",
  title: "Aura Hoop I",
  variantId: "variant-1",
  variantTitle: "One Size",
  ...overrides,
})

beforeEach(() => {
  issuesRef.current = []
  useCartStore.setState({ items: [cartItem()] })
})

afterEach(() => {
  cleanup()
})

describe("CartItemCard", () => {
  it("shows the title, the variant and the unit price", () => {
    renderWithProviders(<CartItemCard item={cartItem()} />)

    expect(screen.getAllByRole("link", { name: "Aura Hoop I" })).toHaveLength(2)
    expect(screen.getByText("One Size")).toBeInTheDocument()
    expect(screen.getByText("PLN 340.00")).toBeInTheDocument()
  })

  it("hides the variant line for a product without variants", () => {
    renderWithProviders(<CartItemCard item={cartItem({ variantTitle: "" })} />)

    expect(screen.queryByText("One Size")).not.toBeInTheDocument()
  })

  it("prices the line from the raw minor units rather than the stored label", () => {
    renderWithProviders(<CartItemCard item={cartItem({ price: "1.00", rawPrice: 42_000 })} />)

    expect(screen.getByText("PLN 420.00")).toBeInTheDocument()
  })

  it("falls back to parsing the label when the raw price is below the store minimum", () => {
    renderWithProviders(<CartItemCard item={cartItem({ price: "12.50", rawPrice: 0 })} />)

    expect(screen.getByText("PLN 12.50")).toBeInTheDocument()
  })

  it("raises the quantity in the store when the plus button is used", async () => {
    renderWithProviders(<CartItemCard item={cartItem()} />)

    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }))

    expect(useCartStore.getState().items[0]?.qty).toBe(3)
  })

  it("lowers the quantity in the store when the minus button is used", async () => {
    renderWithProviders(<CartItemCard item={cartItem()} />)

    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }))

    expect(useCartStore.getState().items[0]?.qty).toBe(1)
  })

  it("refuses to lower the quantity below one", () => {
    renderWithProviders(<CartItemCard item={cartItem({ qty: 1 })} />)

    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled()
  })

  it("removes the line from the store", async () => {
    renderWithProviders(<CartItemCard item={cartItem()} />)

    await userEvent.click(screen.getByRole("button", { name: "Remove item" }))

    expect(useCartStore.getState().items).toStrictEqual([])
  })

  it("warns that a line is no longer available when nothing is in stock", () => {
    issuesRef.current = [{ available: 0, qty: 2, variantId: "variant-1" }]
    renderWithProviders(<CartItemCard item={cartItem()} />)

    expect(screen.getByText("No longer available")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled()
  })

  it("names the remaining stock when fewer are left than requested", () => {
    issuesRef.current = [{ available: 1, qty: 2, variantId: "variant-1" }]
    renderWithProviders(<CartItemCard item={cartItem()} />)

    expect(screen.getByText("Only 1 left in stock")).toBeInTheDocument()
  })

  it("stays quiet when the reported availability still covers the line", () => {
    issuesRef.current = [{ available: 5, qty: 2, variantId: "variant-1" }]
    renderWithProviders(<CartItemCard item={cartItem()} />)

    expect(screen.queryByText("No longer available")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeEnabled()
  })

  it("ignores an availability issue reported for another variant", () => {
    issuesRef.current = [{ available: 0, qty: 2, variantId: "variant-other" }]
    renderWithProviders(<CartItemCard item={cartItem()} />)

    expect(screen.queryByText("No longer available")).not.toBeInTheDocument()
  })

  it("links the image and the title to the product page", () => {
    const { container } = renderWithProviders(<CartItemCard item={cartItem()} />)

    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.test/ring.jpg")
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", expect.stringContaining("aura-hoop"))
  })
})
