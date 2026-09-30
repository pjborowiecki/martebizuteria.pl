import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type LineItem } from "~/src/data/order-detail"

import { OrderLineItemRow } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-line-item-row"

afterEach(() => {
  cleanup()
})

const item: LineItem = {
  name: "Aura Hoop I",
  price: "$1,850.00",
  qty: 2,
  sku: "AUR-HP-001-GD",
  total: "$3,700.00",
  variant: "18k Gold / Medium",
}

const renderRow = (lineItem: LineItem) =>
  renderWithProviders(
    <table>
      <tbody>
        <OrderLineItemRow item={lineItem} />
      </tbody>
    </table>,
  )

describe("OrderLineItemRow", () => {
  it("shows the product name and its variant", () => {
    renderRow(item)

    expect(screen.getByText("Aura Hoop I")).toBeInTheDocument()
    expect(screen.getByText("18k Gold / Medium")).toBeInTheDocument()
  })

  it("lays the cells out as sku, quantity, unit price and line total", () => {
    const { container } = renderRow(item)
    const cells = [...container.querySelectorAll("td")].map((cell) => cell.textContent)

    expect(cells.slice(1)).toStrictEqual(["AUR-HP-001-GD", "2", "$1,850.00", "$3,700.00"])
  })

  it("does not compute the line total itself", () => {
    renderRow({ ...item, total: "$0.00" })

    expect(screen.getByText("$0.00")).toBeInTheDocument()
  })
})
