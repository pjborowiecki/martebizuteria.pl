import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

import { buildAccountOrderItem } from "~/src/presentation/components/custom/pages/account/orders/__test__/account-order.fixture"
import { OrderRowItem } from "~/src/presentation/components/custom/pages/account/orders/order-row-item"

afterEach(cleanup)

describe("OrderRowItem", () => {
  it("prices the line by the unit and in total in the order's currency", () => {
    renderWithProviders(<OrderRowItem currencyCode="PLN" item={buildAccountOrderItem()} />)

    expect(screen.getByText("Silver ring")).toBeInTheDocument()
    expect(screen.getByText("Qty: 2 · PLN 120.00 each")).toBeInTheDocument()
    expect(screen.getByText("PLN 240.00")).toBeInTheDocument()
  })

  it("names the variant the customer chose", () => {
    renderWithProviders(<OrderRowItem currencyCode="PLN" item={buildAccountOrderItem({ variantTitle: "Size 12" })} />)

    expect(screen.getByText("Silver ring").nextElementSibling).toHaveTextContent("Size 12")
  })

  it("prints no variant line for a blank variant title", () => {
    renderWithProviders(<OrderRowItem currencyCode="PLN" item={buildAccountOrderItem({ variantTitle: "" })} />)

    expect(screen.getByText("Silver ring").nextElementSibling).toHaveTextContent("Qty: 2 · PLN 120.00 each")
  })

  it("shows the photo of the item", () => {
    renderWithProviders(<OrderRowItem currencyCode="PLN" item={buildAccountOrderItem({ image: "products/silver-ring.jpg" })} />)

    expect(screen.getByRole("img", { name: "Silver ring" }).getAttribute("src")).toContain("products/silver-ring.jpg")
  })

  it("falls back to the shared placeholder image for an item with no photo", () => {
    renderWithProviders(<OrderRowItem currencyCode="PLN" item={buildAccountOrderItem()} />)

    expect(screen.getByRole("img", { name: "Silver ring" }).getAttribute("src")).toContain(PLACEHOLDER_IMAGE)
  })
})
