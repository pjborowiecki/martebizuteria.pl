import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderStatusBadge } from "~/src/presentation/components/custom/pages/admin/orders/components/order-status-badge"

afterEach(() => {
  cleanup()
})

describe("OrderStatusBadge", () => {
  it.each([
    ["pending", "Pending"],
    ["processing", "Processing"],
    ["completed", "Completed"],
    ["cancelled", "Cancelled"],
    ["refunded", "Refunded"],
  ] as const)("labels the %s status", (status, label) => {
    renderWithProviders(<OrderStatusBadge status={status} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("tints a pending order amber", () => {
    renderWithProviders(<OrderStatusBadge status="pending" />)

    expect(screen.getByText("Pending")).toHaveClass("bg-amber-500/10")
  })

  it("tints a completed order emerald", () => {
    renderWithProviders(<OrderStatusBadge status="completed" />)

    expect(screen.getByText("Completed")).toHaveClass("bg-emerald-600")
  })

  it("renders a cancelled order without an extra tint", () => {
    renderWithProviders(<OrderStatusBadge status="cancelled" />)

    expect(screen.getByText("Cancelled")).not.toHaveClass("bg-emerald-600")
  })
})
