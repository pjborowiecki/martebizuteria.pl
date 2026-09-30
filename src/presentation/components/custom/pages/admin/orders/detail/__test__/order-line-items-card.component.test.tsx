import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_LINE_ITEMS, DEMO_SUMMARY } from "~/src/data/order-detail"

import { OrderLineItemsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-line-items-card"

afterEach(() => {
  cleanup()
})

describe("OrderLineItemsCard", () => {
  it("counts the items beside the title", () => {
    renderWithProviders(<OrderLineItemsCard />)

    expect(screen.getByText("Items").textContent).toBe(`Items(${DEMO_LINE_ITEMS.length})`)
  })

  it("heads the table with the translated column names", () => {
    const { container } = renderWithProviders(<OrderLineItemsCard />)
    const headers = [...container.querySelectorAll("th")].map((head) => head.textContent)

    expect(headers).toStrictEqual(["Product", "SKU", "Qty", "Price", "Total"])
  })

  it("renders one row per line item", () => {
    const { container } = renderWithProviders(<OrderLineItemsCard />)

    expect(container.querySelectorAll("tbody tr")).toHaveLength(DEMO_LINE_ITEMS.length)
    for (const item of DEMO_LINE_ITEMS) {
      expect(screen.getByText(item.sku)).toBeInTheDocument()
    }
  })

  it("annotates the shipping and tax lines with their demo labels", () => {
    renderWithProviders(<OrderLineItemsCard />)

    expect(screen.getByText("Shipping").textContent).toBe(`Shipping(${DEMO_SUMMARY.shippingLabel})`)
    expect(screen.getByText("Tax").textContent).toBe(`Tax(${DEMO_SUMMARY.taxLabel})`)
  })

  it("totals the order after the line items", () => {
    renderWithProviders(<OrderLineItemsCard />)

    expect(screen.getByText("Subtotal")).toBeInTheDocument()
    expect(screen.getAllByText(DEMO_SUMMARY.total)).toHaveLength(2)
    expect(screen.getAllByText(DEMO_SUMMARY.shipping)).toHaveLength(2)
  })
})
