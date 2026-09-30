import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderShippingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-shipping-card"

const order = buildAdminOrderDetail()

const renderCard = (detail = order) =>
  renderWithProviders(
    <OrderShippingCard
      delivery={detail.delivery}
      shippingAddress={detail.shippingAddress}
      trackingNumber={detail.trackingNumber}
      trackingUrl={detail.trackingUrl}
    />,
  )

afterEach(() => {
  cleanup()
})

describe("OrderShippingCard", () => {
  it("prints the recipient address", () => {
    renderCard()

    expect(screen.getByText("Shipping Address")).toBeInTheDocument()
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("ul. Mokotowska 12/4")).toBeInTheDocument()
    expect(screen.getByText("00-640 Warszawa")).toBeInTheDocument()
  })

  it("names the courier and its delivery method", () => {
    renderCard()

    expect(screen.getByText("InPost — Paczkomat 24/7")).toBeInTheDocument()
  })

  it("shows the locker and tracking number with a tracking link", () => {
    renderCard()

    expect(screen.getByText("WAW01A")).toBeInTheDocument()
    expect(screen.getByText("00259007123456789012")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open tracking page" })).toHaveAttribute("href", order.trackingUrl ?? "")
  })

  it("states when no address was captured", () => {
    renderCard(
      buildAdminOrderDetail({ delivery: undefined, shippingAddress: undefined, trackingNumber: undefined, trackingUrl: undefined }),
    )

    expect(screen.getByText("No shipping address recorded.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copy shipping address" })).not.toBeInTheDocument()
  })

  it("omits the tracking row until a parcel is registered", () => {
    renderCard(buildAdminOrderDetail({ trackingNumber: undefined, trackingUrl: undefined }))

    expect(screen.queryByText("00259007123456789012")).not.toBeInTheDocument()
  })
})
