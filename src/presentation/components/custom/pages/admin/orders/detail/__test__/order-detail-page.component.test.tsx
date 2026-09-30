import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_LINE_ITEMS, DEMO_TIMELINE } from "~/src/data/order-detail"

import { OrderDetailPage } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-page"

afterEach(() => {
  cleanup()
})

describe("OrderDetailPage", () => {
  it("assembles every card of the order detail view", () => {
    renderWithProviders(<OrderDetailPage />)

    for (const title of [
      "Fulfillment",
      "Items",
      "Activity",
      "Customer",
      "Shipping Address",
      "Billing Address",
      "Payment",
      "Tags",
      "Internal Notes",
    ]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
    }
  })

  it("shows the meta strip labels above the cards", () => {
    renderWithProviders(<OrderDetailPage />)

    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Channel")).toBeInTheDocument()
  })

  it("renders the line items and the activity feed together", () => {
    const { container } = renderWithProviders(<OrderDetailPage />)

    expect(container.querySelectorAll("tbody tr")).toHaveLength(DEMO_LINE_ITEMS.length)
    expect(screen.getByText(DEMO_TIMELINE[0]?.description ?? "")).toBeInTheDocument()
  })

  it("splits the view into a main column and a sidebar", () => {
    const { container } = renderWithProviders(<OrderDetailPage />)

    expect(container.querySelector(".grid")?.children).toHaveLength(2)
  })
})
