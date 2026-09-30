import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderMetaStrip } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-meta-strip"

afterEach(() => {
  cleanup()
})

describe("OrderMetaStrip", () => {
  it("labels every meta column", () => {
    renderWithProviders(<OrderMetaStrip order={buildAdminOrderDetail()} />)

    for (const label of ["Date", "Status", "Fulfillment", "Payment", "Total"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("renders the order, fulfillment and payment states from the order", () => {
    renderWithProviders(<OrderMetaStrip order={buildAdminOrderDetail()} />)

    expect(screen.getByText("Processing")).toBeInTheDocument()
    expect(screen.getByText("Shipped")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
  })

  it("formats the total in the order currency", () => {
    renderWithProviders(<OrderMetaStrip order={buildAdminOrderDetail()} />)

    expect(screen.getByText(/389[.,]00/u)).toBeInTheDocument()
  })

  it("renders the placement date", () => {
    renderWithProviders(<OrderMetaStrip order={buildAdminOrderDetail()} />)

    expect(screen.getByText(/Mar 4, 2026/u)).toBeInTheDocument()
  })

  it("reflects a refunded order rather than a fixed status", () => {
    renderWithProviders(<OrderMetaStrip order={buildAdminOrderDetail({ paymentUiKey: "refunded", status: "refunded" })} />)

    expect(screen.getAllByText("Refunded")).toHaveLength(2)
  })
})
