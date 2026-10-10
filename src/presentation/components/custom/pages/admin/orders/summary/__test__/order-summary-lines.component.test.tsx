import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  ORDER_ITEM,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderSummaryLines } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-lines"

afterEach(() => {
  cleanup()
})

describe("OrderSummaryLines items", () => {
  it("lists each line with its variant, quantity, unit price and line total", () => {
    renderWithProviders(<OrderSummaryLines order={buildAdminOrderDetail()} />)
    const row = screen.getByRole("row", { name: /Aura Hoop I/u })

    expect(row).toHaveTextContent("18k Gold / Medium")
    expect(row).toHaveTextContent("2")
    expect(row).toHaveTextContent(/185[.,]00/u)
    expect(row).toHaveTextContent(/370[.,]00/u)
  })

  it("leaves the variant out of a line that has none", () => {
    renderWithProviders(<OrderSummaryLines order={buildAdminOrderDetail({ items: [{ ...ORDER_ITEM, variantTitle: undefined }] })} />)

    expect(screen.queryByText("18k Gold / Medium")).toBeNull()
  })
})

describe("OrderSummaryLines totals", () => {
  it("adds up the order and states the VAT its gross total includes", () => {
    renderWithProviders(<OrderSummaryLines order={buildAdminOrderDetail({ taxTotalMinorUnits: 7274 })} />)

    expect(screen.getByText("Subtotal").nextSibling).toHaveTextContent(/370[.,]00/u)
    expect(screen.getByText("Shipping (Paczkomat 24/7)").nextSibling).toHaveTextContent(/19[.,]00/u)
    expect(screen.getByText("Total", { selector: "span" }).nextSibling).toHaveTextContent(/389[.,]00/u)
    expect(screen.getByText("Including VAT 23%").nextSibling).toHaveTextContent(/72[.,]74/u)
  })

  it("names the VAT rate the order was taxed at", () => {
    renderWithProviders(<OrderSummaryLines order={buildAdminOrderDetail({ taxBasisPoints: 800 })} />)

    expect(screen.getByText("Including VAT 8%")).toBeInTheDocument()
  })

  it("shows the discount only when the order has one", () => {
    renderWithProviders(<OrderSummaryLines order={buildAdminOrderDetail()} />)

    expect(screen.queryByText("Discount")).toBeNull()

    cleanup()
    renderWithProviders(<OrderSummaryLines order={buildAdminOrderDetail({ discountTotalMinorUnits: 5000 })} />)

    expect(screen.getByText("Discount").nextSibling).toHaveTextContent(/−.*50[.,]00/u)
  })

  it("labels shipping without a method when the order has no delivery method", () => {
    renderWithProviders(<OrderSummaryLines order={buildAdminOrderDetail({ delivery: undefined })} />)

    expect(screen.getByText("Shipping")).toBeInTheDocument()
  })
})
