import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_ORDER, DEMO_SUMMARY, ORDER_PAYMENT_STYLES, ORDER_STATUS_STYLES } from "~/src/data/order-detail"

import { OrderMetaStrip } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-meta-strip"

afterEach(() => {
  cleanup()
})

describe("OrderMetaStrip", () => {
  it("labels every meta field in English", () => {
    renderWithProviders(<OrderMetaStrip />)

    for (const label of ["Date", "Status", "Payment", "Channel", "Total"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("shows the order date and time together", () => {
    renderWithProviders(<OrderMetaStrip />)

    expect(screen.getByText(`${DEMO_ORDER.date}, ${DEMO_ORDER.time}`)).toBeInTheDocument()
  })

  it("translates the order status rather than printing the raw code", () => {
    renderWithProviders(<OrderMetaStrip />)

    expect(screen.getByText("Shipped")).toBeInTheDocument()
    expect(screen.queryByText(DEMO_ORDER.status)).not.toBeInTheDocument()
  })

  it("tints the status badge with the style mapped to that status", () => {
    renderWithProviders(<OrderMetaStrip />)
    const badge = screen.getByText("Shipped")

    expect(badge.className).toContain(ORDER_STATUS_STYLES[DEMO_ORDER.status])
  })

  it("translates the payment state and tints its badge", () => {
    renderWithProviders(<OrderMetaStrip />)
    const badge = screen.getByText("Paid")

    expect(badge.className).toContain(ORDER_PAYMENT_STYLES[DEMO_ORDER.payment])
  })

  it("shows the sales channel and the order total", () => {
    renderWithProviders(<OrderMetaStrip />)

    expect(screen.getByText(DEMO_ORDER.channel)).toBeInTheDocument()
    expect(screen.getByText(DEMO_SUMMARY.total)).toBeInTheDocument()
  })
})
