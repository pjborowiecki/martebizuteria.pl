import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { FulfillmentStepItem } from "~/src/presentation/components/custom/pages/admin/orders/detail/fulfillment-step-item"

afterEach(() => {
  cleanup()
})

describe("FulfillmentStepItem", () => {
  it("translates the step key into its English label", () => {
    renderWithProviders(<FulfillmentStepItem index={3} step={{ date: undefined, done: false, key: "outForDelivery" }} />)

    expect(screen.getByText("Out for Delivery")).toBeInTheDocument()
  })

  it("shows the timestamp of a step that already happened", () => {
    renderWithProviders(<FulfillmentStepItem index={0} step={{ date: "Oct 24, 14:32", done: true, key: "confirmed" }} />)

    expect(screen.getByText("Oct 24, 14:32")).toBeInTheDocument()
  })

  it("emphasises a completed step and marks it with a tick", () => {
    const { container } = renderWithProviders(
      <FulfillmentStepItem index={1} step={{ date: "Oct 24, 15:10", done: true, key: "processing" }} />,
    )

    expect(screen.getByText("Processing").className).toContain("font-medium")
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("mutes a step that has not happened and shows no tick", () => {
    const { container } = renderWithProviders(<FulfillmentStepItem index={4} step={{ date: undefined, done: false, key: "delivered" }} />)

    expect(screen.getByText("Delivered").className).toContain("text-muted-foreground/50")
    expect(container.querySelector("svg")).toBeNull()
  })

  it("draws no connector before the first step", () => {
    const { container } = renderWithProviders(<FulfillmentStepItem index={0} step={{ date: undefined, done: true, key: "confirmed" }} />)

    expect(container.querySelector(String.raw`.absolute.right-1\/2`)).toBeNull()
  })

  it("draws a solid connector into a completed later step", () => {
    const { container } = renderWithProviders(
      <FulfillmentStepItem index={2} step={{ date: "Oct 25, 09:45", done: true, key: "shipped" }} />,
    )
    const connector = container.querySelector(String.raw`.absolute.right-1\/2`)

    expect(connector).toBeInTheDocument()
    expect(connector?.className).toContain("bg-foreground")
  })

  it("draws a faint connector into a pending later step", () => {
    const { container } = renderWithProviders(<FulfillmentStepItem index={4} step={{ date: undefined, done: false, key: "delivered" }} />)

    expect(container.querySelector(String.raw`.absolute.right-1\/2`)?.className).toContain("bg-border")
  })
})
