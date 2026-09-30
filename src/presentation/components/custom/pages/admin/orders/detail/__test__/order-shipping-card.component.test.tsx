import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_SHIPPING } from "~/src/data/order-detail"

import { OrderShippingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-shipping-card"

afterEach(() => {
  cleanup()
})

describe("OrderShippingCard", () => {
  it("titles the card with the shipping address heading", () => {
    renderWithProviders(<OrderShippingCard />)

    expect(screen.getByText("Shipping Address")).toBeInTheDocument()
  })

  it("prints the address over separate lines with city and postcode together", () => {
    renderWithProviders(<OrderShippingCard />)

    expect(screen.getByText(DEMO_SHIPPING.name)).toBeInTheDocument()
    expect(screen.getByText(DEMO_SHIPPING.line1)).toBeInTheDocument()
    expect(screen.getByText(DEMO_SHIPPING.line2)).toBeInTheDocument()
    expect(screen.getByText(`${DEMO_SHIPPING.city}, ${DEMO_SHIPPING.postcode}`)).toBeInTheDocument()
    expect(screen.getByText(DEMO_SHIPPING.country)).toBeInTheDocument()
  })

  it("shows the carrier and the tracking number", () => {
    renderWithProviders(<OrderShippingCard />)

    expect(screen.getByText(DEMO_SHIPPING.method)).toBeInTheDocument()
    expect(screen.getByText(DEMO_SHIPPING.tracking)).toBeInTheDocument()
  })

  it("labels the estimated delivery date", () => {
    renderWithProviders(<OrderShippingCard />)

    expect(screen.getByText("Est. delivery", { exact: false }).textContent).toBe(`Est. delivery: ${DEMO_SHIPPING.estimatedDelivery}`)
  })

  it("offers a copy action and a link out to the carrier", () => {
    renderWithProviders(<OrderShippingCard />)

    expect(screen.getAllByRole("button")).toHaveLength(2)
  })
})
