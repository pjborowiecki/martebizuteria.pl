import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { APP_NAME } from "~/src/presentation/branding/app"

import { CheckoutHeader } from "~/src/presentation/components/custom/checkout/components/checkout-header"

afterEach(() => {
  cleanup()
})

describe("CheckoutHeader", () => {
  it("shows the shop name as the only checkout navigation", () => {
    renderWithProviders(<CheckoutHeader />)

    expect(screen.getByRole("link", { name: APP_NAME })).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("sends the shopper back to the storefront home page", () => {
    renderWithProviders(<CheckoutHeader />)

    expect(screen.getByRole("link", { name: APP_NAME }).getAttribute("href")).toBe("/")
  })

  it("renders inside a banner landmark", () => {
    renderWithProviders(<CheckoutHeader />)

    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("link", { name: APP_NAME }))
  })
})
