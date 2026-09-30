import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock(import("~/src/data/order-detail"), async (importOriginal) => ({
  ...(await importOriginal()),
  ORDER_PAYMENT_STYLES: {},
  ORDER_STATUS_STYLES: {},
}))

import { OrderMetaStrip } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-meta-strip"

afterEach(() => {
  cleanup()
})

describe("OrderMetaStrip without a mapped badge style", () => {
  it("still names the order status and leaves its badge untinted", () => {
    renderWithProviders(<OrderMetaStrip />)
    const badge = screen.getByText("Shipped")

    expect(badge.className).not.toContain("undefined")
    expect(badge.className).toContain("bg-secondary")
  })

  it("still names the payment state and leaves its badge untinted", () => {
    renderWithProviders(<OrderMetaStrip />)
    const badge = screen.getByText("Paid")

    expect(badge.className).not.toContain("undefined")
    expect(badge.className).toContain("bg-secondary")
  })

  it("keeps the rest of the meta strip readable", () => {
    renderWithProviders(<OrderMetaStrip />)

    expect(screen.getByText("Online Store")).toBeInTheDocument()
    expect(screen.getByText("Oct 24, 2023, 14:32 CET")).toBeInTheDocument()
  })
})
