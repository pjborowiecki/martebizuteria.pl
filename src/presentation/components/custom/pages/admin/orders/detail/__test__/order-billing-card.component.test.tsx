import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SHIPPING_ADDRESS } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderBillingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-billing-card"

afterEach(() => {
  cleanup()
})

describe("OrderBillingCard", () => {
  it("titles the card and badges a shared shipping address", () => {
    renderWithProviders(<OrderBillingCard billingAddress={SHIPPING_ADDRESS} sameAsShipping />)

    expect(screen.getByText("Billing Address")).toBeInTheDocument()
    expect(screen.getByText("Same as shipping")).toBeInTheDocument()
  })

  it("prints a separate billing address without the badge", () => {
    renderWithProviders(<OrderBillingCard billingAddress={{ ...SHIPPING_ADDRESS, name: "M'Arte Sp. z o.o." }} sameAsShipping={false} />)

    expect(screen.getByText("M'Arte Sp. z o.o.")).toBeInTheDocument()
    expect(screen.queryByText("Same as shipping")).not.toBeInTheDocument()
  })

  it("states when no billing address was captured", () => {
    renderWithProviders(<OrderBillingCard billingAddress={undefined} sameAsShipping={false} />)

    expect(screen.getByText("No billing address recorded.")).toBeInTheDocument()
  })
})
