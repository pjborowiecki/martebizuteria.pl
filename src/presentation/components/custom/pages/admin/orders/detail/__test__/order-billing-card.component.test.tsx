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
    renderWithProviders(
      <OrderBillingCard billingAddress={SHIPPING_ADDRESS} billingCompanyName={undefined} billingNip={undefined} sameAsShipping />,
    )

    expect(screen.getByText("Billing Address")).toBeInTheDocument()
    expect(screen.getByText("Same as shipping")).toBeInTheDocument()
  })

  it("prints a separate billing address without the badge", () => {
    renderWithProviders(
      <OrderBillingCard
        billingAddress={{ ...SHIPPING_ADDRESS, name: "M'Arte Sp. z o.o." }}
        billingCompanyName={undefined}
        billingNip={undefined}
        sameAsShipping={false}
      />,
    )

    expect(screen.getByText("M'Arte Sp. z o.o.")).toBeInTheDocument()
    expect(screen.queryByText("Same as shipping")).not.toBeInTheDocument()
  })

  it("states when no billing address was captured", () => {
    renderWithProviders(
      <OrderBillingCard billingAddress={undefined} billingCompanyName={undefined} billingNip={undefined} sameAsShipping={false} />,
    )

    expect(screen.getByText("No billing address recorded.")).toBeInTheDocument()
  })

  it("names the company and NIP the customer asked to be invoiced", () => {
    renderWithProviders(
      <OrderBillingCard
        billingAddress={SHIPPING_ADDRESS}
        billingCompanyName="Pracownia Złotnicza sp. z o.o."
        billingNip="5260001246"
        sameAsShipping
      />,
    )

    expect(screen.getByText("Invoice for a company")).toBeInTheDocument()
    expect(screen.getByText("Pracownia Złotnicza sp. z o.o.")).toBeInTheDocument()
    expect(screen.getByText("NIP 5260001246")).toBeInTheDocument()
  })

  it("shows whichever of the company name and NIP the order recorded", () => {
    renderWithProviders(
      <OrderBillingCard billingAddress={SHIPPING_ADDRESS} billingCompanyName={undefined} billingNip="5260001246" sameAsShipping />,
    )

    expect(screen.getByText("Invoice for a company")).toBeInTheDocument()
    expect(screen.getByText("NIP 5260001246")).toBeInTheDocument()

    cleanup()
    renderWithProviders(
      <OrderBillingCard billingAddress={SHIPPING_ADDRESS} billingCompanyName="Pracownia Złotnicza" billingNip={undefined} sameAsShipping />,
    )

    expect(screen.getByText("Pracownia Złotnicza")).toBeInTheDocument()
    expect(screen.queryByText(/^NIP /u)).not.toBeInTheDocument()
  })

  it("leaves the invoice block out when the customer did not ask for an invoice", () => {
    renderWithProviders(
      <OrderBillingCard billingAddress={SHIPPING_ADDRESS} billingCompanyName={undefined} billingNip={undefined} sameAsShipping />,
    )

    expect(screen.queryByText("Invoice for a company")).not.toBeInTheDocument()
  })
})
