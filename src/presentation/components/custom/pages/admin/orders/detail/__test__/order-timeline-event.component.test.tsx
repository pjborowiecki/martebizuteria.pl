import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderTimelineEvent } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-event"

afterEach(() => {
  cleanup()
})

describe("OrderTimelineEvent", () => {
  it("shows the description and the timestamp of the event", () => {
    renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 24, 14:32", description: "Order MR-9241 placed", status: undefined, type: "order" }} />,
    )

    expect(screen.getByText("Order MR-9241 placed")).toBeInTheDocument()
    expect(screen.getByText("Oct 24, 14:32")).toBeInTheDocument()
  })

  it("translates the delivery status of an email event", () => {
    renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 25, 09:46", description: "Dispatch email sent", status: "delivered", type: "email" }} />,
    )

    expect(screen.getByText("Delivered")).toBeInTheDocument()
  })

  it("colours a bounced email red", () => {
    renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 25, 09:46", description: "Receipt email rejected", status: "bounced", type: "email" }} />,
    )

    expect(screen.getByText("Bounced").className).toContain("text-red-500")
  })

  it("colours a deferred email amber", () => {
    renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 25, 09:46", description: "Receipt email delayed", status: "deferred", type: "email" }} />,
    )

    expect(screen.getByText("Deferred").className).toContain("text-amber-500")
  })

  it("shows no status badge for an email event without a delivery status", () => {
    renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 25, 09:46", description: "Queued email", status: undefined, type: "email" }} />,
    )

    expect(screen.queryByText("Delivered")).not.toBeInTheDocument()
  })

  it("shows no status badge for a non-email event that carries a status", () => {
    renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 25, 09:45", description: "Package shipped", status: "delivered", type: "shipping" }} />,
    )

    expect(screen.queryByText("Delivered")).not.toBeInTheDocument()
  })

  it("renders a single icon for a known event type and no status overlay", () => {
    const { container } = renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 24, 14:33", description: "Payment captured", status: undefined, type: "payment" }} />,
    )

    expect(container.querySelectorAll("svg")).toHaveLength(1)
  })

  it("adds a status overlay icon beside the event icon for a delivered email", () => {
    const { container } = renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 24, 14:33", description: "Receipt sent", status: "delivered", type: "email" }} />,
    )

    expect(container.querySelectorAll("svg")).toHaveLength(2)
  })

  it("falls back to the clock icon for an event type it does not know", () => {
    const { container } = renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 24, 14:33", description: "Something new", status: undefined, type: "webhook" }} />,
    )

    expect(container.querySelectorAll("svg")).toHaveLength(1)
    expect(screen.getByText("Something new")).toBeInTheDocument()
  })

  it("ignores an email status it has no configuration for", () => {
    const { container } = renderWithProviders(
      <OrderTimelineEvent event={{ date: "Oct 24, 14:33", description: "Unknown state", status: "queued", type: "email" }} />,
    )

    expect(container.querySelectorAll("svg")).toHaveLength(1)
  })
})
