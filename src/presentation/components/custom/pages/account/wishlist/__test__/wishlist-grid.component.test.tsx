import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { WISHLIST_QUERY_KEYS } from "~/src/modules/wishlist/wishlist.constants"
import { type Wishlist } from "~/src/modules/wishlist/wishlist.types"

const calls = vi.hoisted(() => ({
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  toggle: vi.fn<(input: { productId: string }) => Promise<{ wishlisted: boolean }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/modules/wishlist/use-cases/toggle-wishlist-item", async () => {
  const { WISHLIST_MUTATION_KEYS } = await import("~/src/modules/wishlist/wishlist.constants")

  return { toggleWishlistItemMutation: { mutationFn: calls.toggle, mutationKey: WISHLIST_MUTATION_KEYS.TOGGLE } }
})
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }): JSX.Element => <img alt={alt} src={src} />,
}))

import { WishlistGrid } from "~/src/presentation/components/custom/pages/account/wishlist/wishlist-grid"

const savedProduct = (overrides: Partial<Wishlist["product"]> = {}): Wishlist["product"] => ({
  addedAt: new Date("2026-09-14T10:00:00.000Z"),
  available: true,
  handle: "aurora-ring",
  inStock: true,
  priceMinorUnits: 24_900,
  productId: "product-1",
  thumbnail: "/products/aurora.avif",
  title: "Aurora ring",
  variantId: "variant-1",
  variantTitle: "Gold / 54",
  ...overrides,
})

const addToCartButton = (): HTMLElement => screen.getByRole("button", { name: "Add to cart" })

const removeButton = (): HTMLElement => screen.getByRole("button", { name: "Remove from wishlist" })

beforeEach(() => {
  vi.clearAllMocks()
  calls.toggle.mockResolvedValue({ wishlisted: false })
  useCartStore.getState().clearCart()
})

afterEach(cleanup)

describe("WishlistGrid add to cart", () => {
  it("puts the saved product's variant into the cart at the price shown on the card", async () => {
    renderWithProviders(<WishlistGrid items={[savedProduct()]} />)
    const shownPrice = screen.getByText("PLN 249.00").textContent

    await userEvent.click(addToCartButton())

    expect(useCartStore.getState().items).toStrictEqual([
      {
        id: "variant-1",
        image: "/products/aurora.avif",
        price: shownPrice,
        qty: 1,
        rawPrice: 24_900,
        slug: "aurora-ring",
        title: "Aurora ring",
        variantId: "variant-1",
        variantTitle: "Gold / 54",
      },
    ])
  })

  it("adds a product saved without a picture or a variant name and shows no broken image", async () => {
    renderWithProviders(<WishlistGrid items={[savedProduct({ thumbnail: undefined, variantTitle: undefined })]} />)

    await userEvent.click(addToCartButton())

    expect(screen.queryByRole("img")).toBeNull()
    expect(useCartStore.getState().items).toMatchObject([{ image: "", variantId: "variant-1", variantTitle: "" }])
  })

  it("keeps a product that has no purchasable variant out of the cart", async () => {
    renderWithProviders(<WishlistGrid items={[savedProduct({ variantId: undefined })]} />)

    await userEvent.click(addToCartButton())

    expect(addToCartButton()).toBeDisabled()
    expect(useCartStore.getState().items).toStrictEqual([])
  })
})

describe("WishlistGrid removal", () => {
  it("removes the product and refreshes every wishlist read", async () => {
    const { queryClient } = renderWithProviders(<WishlistGrid items={[savedProduct()]} />)
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")

    await userEvent.click(removeButton())

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledWith("Removed from your wishlist")
    })
    expect(calls.toggle.mock.calls[0]?.[0]).toStrictEqual({ productId: "product-1" })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: WISHLIST_QUERY_KEYS.ROOT })
  })

  it("says so when the product could not be removed and leaves the list alone", async () => {
    calls.toggle.mockRejectedValue(new Error("offline"))
    const { queryClient } = renderWithProviders(<WishlistGrid items={[savedProduct()]} />)
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")

    await userEvent.click(removeButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("We could not remove that item. Please try again.")
    })
    expect(calls.toastSuccess).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it("blocks a second removal while the first is still running", async () => {
    const inFlight = Promise.withResolvers<{ wishlisted: boolean }>()
    calls.toggle.mockReturnValue(inFlight.promise)
    renderWithProviders(<WishlistGrid items={[savedProduct()]} />)

    await userEvent.click(removeButton())

    await waitFor(() => {
      expect(removeButton()).toBeDisabled()
    })
    inFlight.resolve({ wishlisted: false })
    await waitFor(() => {
      expect(removeButton()).toBeEnabled()
    })
    expect(calls.toggle).toHaveBeenCalledOnce()
  })
})
