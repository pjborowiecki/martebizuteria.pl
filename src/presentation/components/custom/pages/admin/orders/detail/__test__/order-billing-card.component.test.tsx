import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_BILLING } from "~/src/data/order-detail"

import { OrderBillingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-billing-card"

afterEach(() => {
  cleanup()
})

describe("OrderBillingCard", () => {
  it("titles the card and states that billing matches shipping", () => {
    renderWithProviders(<OrderBillingCard />)

    expect(screen.getByText("Billing Address")).toBeInTheDocument()
    expect(screen.getByText("Same as shipping")).toBeInTheDocument()
  })

  it("prints the billing address with city and postcode on one line", () => {
    renderWithProviders(<OrderBillingCard />)

    expect(screen.getByText(DEMO_BILLING.name)).toBeInTheDocument()
    expect(screen.getByText(DEMO_BILLING.line1)).toBeInTheDocument()
    expect(screen.getByText(DEMO_BILLING.line2)).toBeInTheDocument()
    expect(screen.getByText(`${DEMO_BILLING.city}, ${DEMO_BILLING.postcode}`)).toBeInTheDocument()
    expect(screen.getByText(DEMO_BILLING.country)).toBeInTheDocument()
  })

  it("carries no tracking or carrier details, unlike the shipping card", () => {
    renderWithProviders(<OrderBillingCard />)

    expect(screen.queryByText("Est. delivery", { exact: false })).not.toBeInTheDocument()
  })
})
