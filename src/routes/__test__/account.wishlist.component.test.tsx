import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Wishlist } from "~/src/modules/wishlist/wishlist.types"

const toggleWishlistItem = vi.hoisted(() => vi.fn<() => Promise<{ wishlisted: boolean }>>(() => Promise.resolve({ wishlisted: false })))

vi.mock("~/src/modules/wishlist/use-cases/toggle-wishlist-item", () => ({
  toggleWishlistItemMutation: { mutationFn: toggleWishlistItem, mutationKey: ["wishlist", "toggleItem"] },
}))
vi.mock("~/src/modules/wishlist/use-cases/list-wishlist-items", () => ({
  listWishlistItemsQuery: (locale: string) => ({ queryFn: () => Promise.resolve([]), queryKey: ["wishlist", "items", locale] }),
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

import { TEST_LOCALE } from "~/src/platform/testing/lib/messages"

import { Route } from "~/src/routes/account.wishlist"

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

const WishlistPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the wishlist route renders no component")
  }

  return <Page />
}

const renderWishlist = (items: readonly Wishlist["product"][]) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(["wishlist", "items", TEST_LOCALE], items)

  return renderWithProviders(<WishlistPage />, { queryClient })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("account wishlist page", () => {
  it("titles the page after the saved favourites", () => {
    renderWishlist([])

    expect(screen.getByText("Favorites")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Wishlist" })).toBeInTheDocument()
  })

  it("counts the items the customer has saved", () => {
    renderWishlist([savedProduct(), savedProduct({ handle: "luna-ring", productId: "product-2", title: "Luna ring" })])

    expect(screen.getByText("You have 2 saved items in your wishlist.")).toBeInTheDocument()
  })

  it("lists a saved product with its price, link and the date it was saved", () => {
    renderWishlist([savedProduct()])

    const productLinks = screen.getAllByRole("link", { name: "Aurora ring" })

    expect(productLinks.map((link) => link.getAttribute("href"))).toStrictEqual(["/products/aurora-ring", "/products/aurora-ring"])
    expect(screen.getByText("PLN 249.00")).toBeInTheDocument()
    expect(screen.getByText("Saved September 14, 2026")).toBeInTheDocument()
  })

  it("lets the customer move a saved product into the cart", () => {
    renderWishlist([savedProduct()])

    expect(screen.getByRole("button", { name: "Add to cart" })).toBeEnabled()
  })

  it("marks a saved product that has sold out and blocks the add to cart", () => {
    renderWishlist([savedProduct({ inStock: false })])

    expect(screen.getByText("Out of Stock")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled()
  })

  it("marks a saved product the shop has withdrawn", () => {
    renderWishlist([savedProduct({ available: false })])

    expect(screen.getByText("Unavailable")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled()
  })

  it("offers to remove each saved product", () => {
    renderWishlist([savedProduct()])

    expect(screen.getByRole("button", { name: "Remove from wishlist" })).toBeInTheDocument()
  })

  it("says the wishlist is empty and sends the shopper to the catalogue", () => {
    renderWishlist([])

    expect(screen.getByText("Your wishlist is empty")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Browse Products" })).toHaveAttribute("href", "/products")
  })
})
