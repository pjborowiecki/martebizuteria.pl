import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

afterEach(() => {
  cleanup()
})

describe("LocalizedLink", () => {
  it("renders its children inside an anchor", () => {
    renderWithProviders(<LocalizedLink to="/cart">Cart</LocalizedLink>)

    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument()
  })

  it("points the anchor at the given route", () => {
    renderWithProviders(<LocalizedLink to="/cart">Cart</LocalizedLink>)

    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart")
  })

  it("interpolates the params a dynamic route needs", () => {
    renderWithProviders(
      <LocalizedLink params={{ handle: "rings" }} to="/categories/$handle">
        Rings
      </LocalizedLink>,
    )

    expect(screen.getByRole("link", { name: "Rings" })).toHaveAttribute("href", "/categories/rings")
  })

  it("keeps the current params when none are given, so a locale segment survives", () => {
    renderWithProviders(<LocalizedLink to="/about">About</LocalizedLink>)

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about")
  })

  it("forwards presentation props to the anchor", () => {
    renderWithProviders(
      <LocalizedLink aria-label="Go to the cart" className="underline" to="/cart">
        Cart
      </LocalizedLink>,
    )
    const link = screen.getByRole("link", { name: "Go to the cart" })

    expect(link).toHaveClass("underline")
  })

  it("marks the link to the current route as active", () => {
    renderWithProviders(<LocalizedLink to="/">Home</LocalizedLink>)

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("data-status", "active")
  })

  it("does not mark a link to another route as active", () => {
    renderWithProviders(<LocalizedLink to="/cart">Cart</LocalizedLink>)

    expect(screen.getByRole("link", { name: "Cart" })).not.toHaveAttribute("data-status", "active")
  })
})
