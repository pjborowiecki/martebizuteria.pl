import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { markAsCut } from "~/src/platform/testing/lib/cut-text"
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

const LONG_TITLE = "Sofa narożna z funkcją spania i pojemnikiem na pościel, tkanina welurowa hydrofobowa, kolor butelkowa zieleń"

const LONG_SKU = "MARTE-SOFA-NAROZ-280-WELUR-ZIEL"

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

  it("wraps a long product title instead of widening the table", () => {
    renderRow({ ...ORDER_ITEM, title: LONG_TITLE })
    const title = screen.getByText(LONG_TITLE)

    expect(title.parentElement).toHaveClass("min-w-0")
    expect(title.closest("td")).toHaveClass("whitespace-normal")
  })

  it("cuts a long sku short and shows it in full on hover", async () => {
    renderRow({ ...ORDER_ITEM, sku: LONG_SKU })
    const sku = screen.getByText(LONG_SKU)

    expect(sku).toHaveClass("truncate", "min-w-0")
    expect(sku.closest("td")).toHaveClass("max-w-40")

    await userEvent.hover(markAsCut(sku))

    expect(await screen.findByText(LONG_SKU, { selector: "[data-slot='tooltip-content']" })).toBeInTheDocument()
  })

  it("renders the product image when one is stored", () => {
    renderRow({ ...ORDER_ITEM, imageUrl: "https://cdn.example.com/aura.jpg" })

    expect(screen.getByRole("img", { name: "Aura Hoop I" })).toBeInTheDocument()
  })
})
