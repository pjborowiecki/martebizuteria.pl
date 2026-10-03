import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  DELIVERED_AT,
  SHIPPED_AT,
  buildAccountOrderDetail,
} from "~/src/presentation/components/custom/pages/account/orders/__test__/account-order.fixture"
import { ShipmentBanner } from "~/src/presentation/components/custom/pages/account/orders/order-shipment-banner"

afterEach(cleanup)

describe("ShipmentBanner", () => {
  it("stays out of the page until the order ships", () => {
    const { container } = renderWithProviders(<ShipmentBanner order={buildAccountOrderDetail()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("dates the shipment of a parcel sent without tracking", () => {
    renderWithProviders(<ShipmentBanner order={buildAccountOrderDetail({ shippedAt: SHIPPED_AT })} />)

    expect(screen.getByText("Shipped on Feb 3, 2026")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("says a tracked parcel is on its way and offers its tracking number", () => {
    renderWithProviders(<ShipmentBanner order={buildAccountOrderDetail({ shippedAt: SHIPPED_AT, trackingNumber: "PL123" })} />)

    expect(screen.getByText("On its way since Feb 3, 2026")).toBeInTheDocument()
    expect(screen.getByText("PL123")).toBeInTheDocument()
    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("links the tracking number to the carrier's tracking page", () => {
    renderWithProviders(
      <ShipmentBanner
        order={buildAccountOrderDetail({ shippedAt: SHIPPED_AT, trackingNumber: "PL123", trackingUrl: "https://tracking.test/PL123" })}
      />,
    )

    expect(screen.getByRole("link", { name: "PL123" })).toHaveAttribute("href", "https://tracking.test/PL123")
  })

  it("dates the delivery once the parcel arrived", () => {
    renderWithProviders(<ShipmentBanner order={buildAccountOrderDetail({ deliveredAt: DELIVERED_AT, shippedAt: SHIPPED_AT })} />)

    expect(screen.getByText("Delivered on Feb 5, 2026")).toBeInTheDocument()
    expect(screen.queryByText(/Shipped on|On its way since/u)).toBeNull()
  })

  it("dates a delivery even when the shipment itself was never recorded", () => {
    renderWithProviders(<ShipmentBanner order={buildAccountOrderDetail({ deliveredAt: DELIVERED_AT, trackingNumber: "PL123" })} />)

    expect(screen.getByText("Delivered on Feb 5, 2026")).toBeInTheDocument()
    expect(screen.getByText("PL123")).toBeInTheDocument()
  })
})
