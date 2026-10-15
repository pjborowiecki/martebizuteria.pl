import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { markAsCut } from "~/src/platform/testing/lib/cut-text"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderFulfillmentCell } from "~/src/presentation/components/custom/pages/admin/orders/components/order-fulfillment-cell"

const LONG_FULFILLMENT_KEY = "awaiting_pickup_at_parcel_locker_after_redirect"

afterEach(() => {
  cleanup()
})

describe("OrderFulfillmentCell", () => {
  it.each([
    ["pending", "Awaiting payment"],
    ["confirmed", "Confirmed"],
    ["processing", "In progress"],
    ["shipped", "Shipped"],
    ["delivered", "Delivered"],
    ["cancelled", "Cancelled"],
  ])("labels the %s fulfillment state", (fulfillmentUiKey, label) => {
    renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey={fulfillmentUiKey} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("colours the shipped dot blue", () => {
    const { container } = renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey="shipped" />)

    expect(container.querySelector(".bg-blue-500")).not.toBeNull()
  })

  it("colours an order in progress apart from a merely confirmed one", () => {
    const { container } = renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey="processing" />)

    expect(container.querySelector(".bg-violet-500")).not.toBeNull()
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

  it("cuts a long state short beside its dot and shows it in full on hover", async () => {
    const { container } = renderWithProviders(<OrderFulfillmentCell fulfillmentUiKey={LONG_FULFILLMENT_KEY} />)
    const label = screen.getByText(LONG_FULFILLMENT_KEY)

    expect(label).toHaveClass("truncate", "min-w-0")
    expect(container.querySelector(".rounded-full")).toHaveClass("shrink-0")

    await userEvent.hover(markAsCut(label))

    expect(await screen.findByText(LONG_FULFILLMENT_KEY, { selector: "[data-slot='tooltip-content']" })).toBeInTheDocument()
  })
})
