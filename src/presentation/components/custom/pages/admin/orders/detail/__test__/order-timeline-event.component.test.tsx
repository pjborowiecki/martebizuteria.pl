import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderTimelineEvent } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-event"

const [shippedEvent, emailEvent] = buildAdminOrderDetail().timeline

afterEach(() => {
  cleanup()
})

describe("OrderTimelineEvent", () => {
  it("translates the audit action and shows its detail", () => {
    renderWithProviders(<OrderTimelineEvent event={shippedEvent!} />)

    expect(screen.getByText("Order shipped")).toBeInTheDocument()
    expect(screen.getByText("00259007123456789012")).toBeInTheDocument()
  })

  it("attributes the event to its actor and timestamp", () => {
    renderWithProviders(<OrderTimelineEvent event={shippedEvent!} />)

    expect(screen.getByText("System")).toBeInTheDocument()
    expect(screen.getByText(/Mar 6, 2026/u)).toBeInTheDocument()
  })

  it("badges the delivery status of email events", () => {
    renderWithProviders(<OrderTimelineEvent event={emailEvent!} />)

    expect(screen.getByText("Email sent")).toBeInTheDocument()
    expect(screen.getByText("Sent")).toBeInTheDocument()
  })

  it("omits the email badge for non-email events", () => {
    renderWithProviders(<OrderTimelineEvent event={shippedEvent!} />)

    expect(screen.queryByText("Sent")).not.toBeInTheDocument()
  })
})
