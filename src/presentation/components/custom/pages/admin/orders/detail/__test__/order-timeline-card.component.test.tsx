import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useResendOrderEmail: () => ({ isPending: false, mutate: vi.fn() }),
}))

import {
  ORDER_ID,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderTimelineCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-card"

const order = buildAdminOrderDetail()

afterEach(() => {
  cleanup()
})

describe("OrderTimelineCard", () => {
  it("titles the feed and renders every audit entry", () => {
    renderWithProviders(<OrderTimelineCard orderId={ORDER_ID} timeline={order.timeline} />)

    expect(screen.getByText("Activity")).toBeInTheDocument()
    expect(screen.getByText("Order shipped")).toBeInTheDocument()
    expect(screen.getByText("Email sent")).toBeInTheDocument()
  })

  it("states when an order has no recorded activity", () => {
    renderWithProviders(<OrderTimelineCard orderId={ORDER_ID} timeline={[]} />)

    expect(screen.getByText("No recorded activity for this order yet.")).toBeInTheDocument()
  })
})
