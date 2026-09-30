import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SHIPPED_AT } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { FulfillmentStepItem } from "~/src/presentation/components/custom/pages/admin/orders/detail/fulfillment-step-item"

afterEach(() => {
  cleanup()
})

describe("FulfillmentStepItem", () => {
  it("translates the step key", () => {
    renderWithProviders(<FulfillmentStepItem index={2} step={{ at: SHIPPED_AT, done: true, key: "shipped" }} />)

    expect(screen.getByText("Shipped")).toBeInTheDocument()
  })

  it("dates a completed step", () => {
    renderWithProviders(<FulfillmentStepItem index={2} step={{ at: SHIPPED_AT, done: true, key: "shipped" }} />)

    expect(screen.getByText(/Mar 6/u)).toBeInTheDocument()
  })

  it("leaves an upcoming step undated", () => {
    const { container } = renderWithProviders(<FulfillmentStepItem index={3} step={{ at: undefined, done: false, key: "delivered" }} />)

    expect(container.querySelectorAll("p")).toHaveLength(1)
  })

  it("draws the connector for every step after the first", () => {
    const { container } = renderWithProviders(<FulfillmentStepItem index={1} step={{ at: undefined, done: true, key: "processing" }} />)

    expect(container.querySelector(String.raw`.absolute.right-1\/2`)).toBeInTheDocument()
  })

  it("omits the connector on the first step", () => {
    const { container } = renderWithProviders(<FulfillmentStepItem index={0} step={{ at: undefined, done: true, key: "confirmed" }} />)

    expect(container.querySelector(String.raw`.absolute.right-1\/2`)).not.toBeInTheDocument()
  })
})
