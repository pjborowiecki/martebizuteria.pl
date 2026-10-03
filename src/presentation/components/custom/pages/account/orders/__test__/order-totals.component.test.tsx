import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAccountOrderDetail } from "~/src/presentation/components/custom/pages/account/orders/__test__/account-order.fixture"
import { OrderTotals } from "~/src/presentation/components/custom/pages/account/orders/order-totals"

afterEach(cleanup)

describe("OrderTotals", () => {
  it("adds the subtotal and shipping up to the total", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail()} />)

    expect(screen.getByText("Subtotal").nextSibling).toHaveTextContent("PLN 240.00")
    expect(screen.getByText("Shipping").nextSibling).toHaveTextContent("PLN 15.00")
    expect(screen.getByText("Total").nextSibling).toHaveTextContent("PLN 255.00")
  })

  it("states the VAT contained in the total", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail()} />)

    expect(screen.getByText(/Includes VAT \(23%\)/u)).toHaveTextContent("Includes VAT (23%): PLN 47.66")
  })

  it("subtracts the discount the customer redeemed", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail({ discountMinorUnits: 2000, totalMinorUnits: 23_500 })} />)

    expect(screen.getByText("Discount").nextSibling).toHaveTextContent("−PLN 20.00")
  })

  it("leaves the discount row out of an order without one", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail()} />)

    expect(screen.queryByText("Discount")).toBeNull()
  })

  it("labels the shipping cost with the delivery method the customer chose", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail({ deliveryMethodName: "Kurier InPost" })} />)

    expect(screen.getByText("Kurier InPost").nextSibling).toHaveTextContent("PLN 15.00")
    expect(screen.queryByText("Shipping")).toBeNull()
  })

  it("calls a delivery with no cost free", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail({ shippingMinorUnits: 0, totalMinorUnits: 24_000 })} />)

    expect(screen.getByText("Shipping").nextSibling).toHaveTextContent("Free")
  })

  it("dates a refund and shows what was returned", () => {
    renderWithProviders(
      <OrderTotals
        order={buildAccountOrderDetail({ refund: { amountMinorUnits: 25_500, refundedAt: new Date("2026-02-20T10:00:00.000Z") } })}
      />,
    )

    expect(screen.getByText("Refunded on Feb 20, 2026").nextSibling).toHaveTextContent("−PLN 255.00")
  })

  it("still shows a refund whose date is unknown", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail({ refund: { amountMinorUnits: 5000 } })} />)

    expect(screen.getByText("Refunded").nextSibling).toHaveTextContent("−PLN 50.00")
  })

  it("keeps refund wording off an order that was never refunded", () => {
    renderWithProviders(<OrderTotals order={buildAccountOrderDetail()} />)

    expect(screen.queryByText(/Refunded/u)).toBeNull()
  })
})
