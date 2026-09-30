import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

import { Table, TableBody } from "~/src/presentation/components/shadcn/table"

import { ORDER_ITEM } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderLineItemRow } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-line-item-row"

const renderRow = (item = ORDER_ITEM) =>
  renderWithProviders(
    <Table>
      <TableBody>
        <OrderLineItemRow currencyCode="PLN" item={item} />
      </TableBody>
    </Table>,
  )

afterEach(() => {
  cleanup()
})

describe("OrderLineItemRow", () => {
  it("names the product and its variant", () => {
    renderRow()

    expect(screen.getByText("Aura Hoop I")).toBeInTheDocument()
    expect(screen.getByText("18k Gold / Medium")).toBeInTheDocument()
  })

  it("shows the sku and quantity", () => {
    renderRow()

    expect(screen.getByText("AUR-HP-001-GD")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("formats unit price and line total in the order currency", () => {
    renderRow()

    expect(screen.getByText(/185[.,]00/u)).toBeInTheDocument()
    expect(screen.getByText(/370[.,]00/u)).toBeInTheDocument()
  })

  it("falls back to a placeholder when the variant has no sku", () => {
    renderRow({ ...ORDER_ITEM, sku: undefined })

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("renders the product image when one is stored", () => {
    renderRow({ ...ORDER_ITEM, imageUrl: "https://cdn.example.com/aura.jpg" })

    expect(screen.getByRole("img", { name: "Aura Hoop I" })).toBeInTheDocument()
  })
})
