import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/account.wishlist"

const WishlistPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the wishlist route renders no component")
  }

  return <Page />
}

afterEach(cleanup)

describe("account wishlist page", () => {
  it("titles the page after the saved favourites", () => {
    renderWithProviders(<WishlistPage />)

    expect(screen.getByText("Favorites")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Wishlist" })).toBeInTheDocument()
  })

  it("counts no saved item while the wishlist is not wired up", () => {
    renderWithProviders(<WishlistPage />)

    expect(screen.getByText("You have 0 saved items in your wishlist.")).toBeInTheDocument()
  })

  it("says the wishlist is empty", () => {
    renderWithProviders(<WishlistPage />)

    expect(screen.getByText("Your wishlist is empty")).toBeInTheDocument()
  })

  it("sends the shopper to the catalogue to fill it", () => {
    renderWithProviders(<WishlistPage />)

    expect(screen.getByRole("link", { name: "Browse Products" })).toHaveAttribute("href", "/products")
  })
})
