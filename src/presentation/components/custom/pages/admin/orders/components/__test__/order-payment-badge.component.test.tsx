import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderPaymentBadge } from "~/src/presentation/components/custom/pages/admin/orders/components/order-payment-badge"

afterEach(() => {
  cleanup()
})

describe("OrderPaymentBadge", () => {
  it.each([
    ["paid", "Paid"],
    ["authorized", "Authorized"],
    ["refunded", "Refunded"],
  ])("labels the %s payment state", (paymentUiKey, label) => {
    renderWithProviders(<OrderPaymentBadge paymentUiKey={paymentUiKey} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("tints a paid order emerald", () => {
    renderWithProviders(<OrderPaymentBadge paymentUiKey="paid" />)

    expect(screen.getByText("Paid")).toHaveClass("bg-emerald-600")
  })

  it("shows an unrecognised payment state verbatim", () => {
    renderWithProviders(<OrderPaymentBadge paymentUiKey="partially_refunded" />)

    expect(screen.getByText("partially_refunded")).toBeInTheDocument()
  })

  it("falls back to the secondary badge for an unrecognised payment state", () => {
    renderWithProviders(<OrderPaymentBadge paymentUiKey="partially_refunded" />)

    expect(screen.getByText("partially_refunded")).toHaveClass("bg-secondary")
  })
})
