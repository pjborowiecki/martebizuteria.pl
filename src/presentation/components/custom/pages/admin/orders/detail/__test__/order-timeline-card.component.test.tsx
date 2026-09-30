import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_TIMELINE } from "~/src/data/order-detail"

import { OrderTimelineCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-card"

afterEach(() => {
  cleanup()
})

describe("OrderTimelineCard", () => {
  it("titles the card with the activity heading", () => {
    renderWithProviders(<OrderTimelineCard />)

    expect(screen.getByText("Activity")).toBeInTheDocument()
  })

  it("renders every demo event description", () => {
    renderWithProviders(<OrderTimelineCard />)

    for (const event of DEMO_TIMELINE) {
      expect(screen.getByText(event.description)).toBeInTheDocument()
    }
  })

  it("marks the delivery status of each email event", () => {
    renderWithProviders(<OrderTimelineCard />)
    const emails = DEMO_TIMELINE.filter((event) => event.type === "email")

    expect(screen.getAllByText("Delivered")).toHaveLength(emails.length)
  })

  it("keeps the newest event first", () => {
    const { container } = renderWithProviders(<OrderTimelineCard />)
    const [first] = [...container.querySelectorAll(String.raw`p.text-\[13px\]`)]

    expect(first?.textContent).toBe(DEMO_TIMELINE[0]?.description)
  })
})
