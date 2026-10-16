import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  SHIPPING_ADDRESS,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderSummaryDelivery } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-delivery"

afterEach(() => {
  cleanup()
})

const COURIER_DELIVERY = {
  courierCode: "inpost",
  courierName: "InPost",
  lockerId: undefined,
  lockerPoint: undefined,
  lockerUnconfirmed: false,
  methodName: "Kurier InPost",
  type: "courier",
} as const

describe("OrderSummaryDelivery", () => {
  it("prints the parcel locker as the destination and the customer only as the recipient", () => {
    renderWithProviders(<OrderSummaryDelivery order={buildAdminOrderDetail()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Delivery" })).toBeInTheDocument()
    expect(screen.getByText("Paczkomat 24/7")).toBeInTheDocument()
    expect(screen.getByText("WAW01A")).toBeInTheDocument()
    expect(screen.getByText("Mokotowska 12")).toBeInTheDocument()
    expect(screen.getByText("Recipient")).toBeInTheDocument()
    expect(screen.getByText(SHIPPING_ADDRESS.name)).toBeInTheDocument()
    expect(screen.queryByText(SHIPPING_ADDRESS.line1)).toBeNull()
  })

  it("prints the shipping address of a courier delivery", () => {
    renderWithProviders(<OrderSummaryDelivery order={buildAdminOrderDetail({ delivery: COURIER_DELIVERY })} />)

    expect(screen.getByText("Kurier InPost")).toBeInTheDocument()
    expect(screen.getByText(SHIPPING_ADDRESS.line1)).toBeInTheDocument()
    expect(screen.queryByText("Recipient")).toBeNull()
  })

  it("prints only the heading for an order with no delivery method or address", () => {
    renderWithProviders(<OrderSummaryDelivery order={buildAdminOrderDetail({ delivery: undefined, shippingAddress: undefined })} />)

    expect(screen.getByRole("heading", { level: 2, name: "Delivery" }).closest("section")?.childElementCount).toBe(1)
  })
})
