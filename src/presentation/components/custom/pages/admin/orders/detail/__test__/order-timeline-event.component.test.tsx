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
import { OrderTimelineEvent } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-event"

const [shippedEvent, emailEvent] = buildAdminOrderDetail().timeline

afterEach(() => {
  cleanup()
})

describe("OrderTimelineEvent", () => {
  it("translates the audit action and shows its detail", () => {
    renderWithProviders(<OrderTimelineEvent event={shippedEvent!} orderId={ORDER_ID} />)

    expect(screen.getByText("Order shipped")).toBeInTheDocument()
    expect(screen.getByText("00259007123456789012")).toBeInTheDocument()
  })

  it("attributes the event to its actor and timestamp", () => {
    renderWithProviders(<OrderTimelineEvent event={shippedEvent!} orderId={ORDER_ID} />)

    expect(screen.getByText("System")).toBeInTheDocument()
    expect(screen.getByText(/Mar 6, 2026/u)).toBeInTheDocument()
  })

  it("badges the delivery status of email events", () => {
    renderWithProviders(<OrderTimelineEvent event={emailEvent!} orderId={ORDER_ID} />)

    expect(screen.getByText("Email sent")).toBeInTheDocument()
    expect(screen.getByText("Sent")).toBeInTheDocument()
  })

  it("omits the email badge for non-email events", () => {
    renderWithProviders(<OrderTimelineEvent event={shippedEvent!} orderId={ORDER_ID} />)

    expect(screen.queryByText("Sent")).not.toBeInTheDocument()
  })

  it("offers to resend an email whose last delivery failed", () => {
    const failed = { ...emailEvent!, emailStatus: "failed" as const, labelKey: "emailFailed", resendable: true }

    renderWithProviders(<OrderTimelineEvent event={failed} orderId={ORDER_ID} />)

    expect(screen.getByText("Email failed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resend email" })).toBeInTheDocument()
  })

  it("offers no resend for an email that went out", () => {
    renderWithProviders(<OrderTimelineEvent event={emailEvent!} orderId={ORDER_ID} />)

    expect(screen.queryByRole("button", { name: "Resend email" })).not.toBeInTheDocument()
  })

  it("names a resend the admin asked for", () => {
    const requested = { ...emailEvent!, actorName: "Marta", emailStatus: undefined, labelKey: "emailResendRequested" }

    renderWithProviders(<OrderTimelineEvent event={requested} orderId={ORDER_ID} />)

    expect(screen.getByText("Email resend requested")).toBeInTheDocument()
    expect(screen.getByText("Marta")).toBeInTheDocument()
  })
})
