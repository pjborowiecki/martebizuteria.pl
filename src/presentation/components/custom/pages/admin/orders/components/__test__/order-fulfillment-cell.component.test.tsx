import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderFulfillmentCell } from "~/src/presentation/components/custom/pages/admin/orders/components/order-fulfillment-cell"

afterEach(() => {
  cleanup()
})

describe("OrderFulfillmentCell", () => {
  it.each([
    ["unfulfilled", "Unfulfilled"],
    ["pending", "Pending"],
    ["shipped", "Shipped"],
    ["delivered", "Delivered"],
    ["returned", "Returned"],
  ])("labels the %s fulfillment state", (fulfillmentUiKey, label) => {
    renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey={fulfillmentUiKey} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("colours the shipped dot blue", () => {
    const { container } = renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey="shipped" />)

    expect(container.querySelector(".bg-blue-500")).not.toBeNull()
  })

  it("colours the delivered dot emerald", () => {
    const { container } = renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey="delivered" />)

    expect(container.querySelector(".bg-emerald-500")).not.toBeNull()
  })

  it("shows an unrecognised fulfillment state verbatim with the muted dot", () => {
    const { container } = renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey="partially_shipped" />)

    expect(screen.getByText("partially_shipped")).toBeInTheDocument()
    expect(container.querySelector(String.raw`.bg-muted-foreground\/30`)).not.toBeNull()
  })
})
