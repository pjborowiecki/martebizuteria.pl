import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_FULFILLMENT_STEPS } from "~/src/data/order-detail"

import { OrderFulfillmentTracker } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-fulfillment-tracker"

afterEach(() => {
  cleanup()
})

describe("OrderFulfillmentTracker", () => {
  it("titles the card and lists every fulfillment step in order", () => {
    renderWithProviders(<OrderFulfillmentTracker />)

    expect(screen.getByText("Fulfillment")).toBeInTheDocument()
    expect(screen.getAllByText(/Confirmed|Processing|Shipped|Out for Delivery|Delivered/u)).toHaveLength(DEMO_FULFILLMENT_STEPS.length)
  })

  it("shows a timestamp only for the steps that already happened", () => {
    renderWithProviders(<OrderFulfillmentTracker />)
    const dated = DEMO_FULFILLMENT_STEPS.filter((step) => step.date !== undefined)

    for (const step of dated) {
      expect(screen.getByText(step.date ?? "")).toBeInTheDocument()
    }
    expect(dated).toHaveLength(3)
  })

  it("renders the steps in the order the shipment progresses", () => {
    const { container } = renderWithProviders(<OrderFulfillmentTracker />)
    const labels = [...container.querySelectorAll("p.mt-2")].map((node) => node.textContent)

    expect(labels).toStrictEqual(["Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered"])
  })
})
