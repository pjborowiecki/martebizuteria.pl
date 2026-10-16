import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DisplayPreferencesContext } from "~/src/hooks/use-display-format"

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

import {
  ORDER_ITEM,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderLineItemsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-line-items-card"

afterEach(() => {
  cleanup()
})

describe("OrderLineItemsCard", () => {
  it("titles the card with the line count", () => {
    renderWithProviders(<OrderLineItemsCard order={buildAdminOrderDetail()} />)

    expect(screen.getByText("Items")).toBeInTheDocument()
    expect(screen.getByText("(1)")).toBeInTheDocument()
  })

  it("labels every column", () => {
    renderWithProviders(<OrderLineItemsCard order={buildAdminOrderDetail()} />)

    for (const column of ["Product", "SKU", "Qty", "Price", "Total"]) {
      expect(screen.getAllByText(column).length).toBeGreaterThan(0)
    }
  })

  it("renders one row per order item", () => {
    const { container } = renderWithProviders(
      <OrderLineItemsCard order={buildAdminOrderDetail({ items: [ORDER_ITEM, { ...ORDER_ITEM, id: "item-2" }] })} />,
    )

    expect(container.querySelectorAll("tbody tr")).toHaveLength(2)
  })

  it("summarises subtotal, shipping, tax and total", () => {
    renderWithProviders(<OrderLineItemsCard order={buildAdminOrderDetail()} />)

    expect(screen.getByText("Subtotal")).toBeInTheDocument()
    expect(screen.getByText("Shipping")).toBeInTheDocument()
    expect(screen.getByText("Tax")).toBeInTheDocument()
    expect(screen.getByText(/19[.,]00/u)).toBeInTheDocument()
  })

  it("formats the amounts in the admin's format locale rather than the page's language", () => {
    renderWithProviders(
      <DisplayPreferencesContext value={{ formatLocale: "de-DE", timeZone: "Europe/Berlin" }}>
        <OrderLineItemsCard order={buildAdminOrderDetail()} />
      </DisplayPreferencesContext>,
    )

    expect(screen.getByText("389,00 PLN")).toBeInTheDocument()
    expect(screen.getByText("Subtotal")).toBeInTheDocument()
  })

  it("adds a discount line only when the order carries one", () => {
    renderWithProviders(<OrderLineItemsCard order={buildAdminOrderDetail()} />)

    expect(screen.queryByText("Discount")).not.toBeInTheDocument()

    cleanup()
    renderWithProviders(<OrderLineItemsCard order={buildAdminOrderDetail({ discountTotalMinorUnits: 5000 })} />)

    expect(screen.getByText("Discount")).toBeInTheDocument()
  })
})
