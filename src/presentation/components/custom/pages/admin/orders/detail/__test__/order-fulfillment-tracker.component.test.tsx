import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderFulfillmentTracker } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-fulfillment-tracker"

const order = buildAdminOrderDetail()

afterEach(() => {
  cleanup()
})

describe("OrderFulfillmentTracker", () => {
  it("titles the tracker and renders one item per step", () => {
    renderWithProviders(<OrderFulfillmentTracker canceledAt={undefined} steps={order.fulfillmentSteps} />)

    expect(screen.getByText("Fulfillment")).toBeInTheDocument()
    for (const label of ["Confirmed", "Processing", "Shipped", "Delivered"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("replaces the steps with a cancellation notice for cancelled orders", () => {
    renderWithProviders(<OrderFulfillmentTracker canceledAt={new Date("2026-03-08T08:00:00.000Z")} steps={[]} />)

    expect(screen.getByText(/Order cancelled on/u)).toBeInTheDocument()
    expect(screen.queryByText("Confirmed")).not.toBeInTheDocument()
  })
})
