import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAccountOrderDetail } from "~/src/presentation/components/custom/pages/account/orders/__test__/account-order.fixture"
import { ShippingBlock } from "~/src/presentation/components/custom/pages/account/orders/order-shipping-block"

const SHIPPING_ADDRESS = { city: "Warszawa", countryCode: "PL", line1: "ul. Krucza 1", name: "Anna Kowalska", postalCode: "00-001" }

afterEach(cleanup)

describe("ShippingBlock", () => {
  it("heads a courier delivery with the shipping address", () => {
    renderWithProviders(<ShippingBlock order={buildAccountOrderDetail({ shippingAddress: SHIPPING_ADDRESS })} />)

    expect(screen.getByRole("heading", { name: "Shipping Address" })).toBeInTheDocument()
    expect(screen.getByText("ul. Krucza 1")).toBeInTheDocument()
    expect(screen.queryByText("Pickup Point")).toBeNull()
  })

  it("dashes an address the order never had", () => {
    renderWithProviders(<ShippingBlock order={buildAccountOrderDetail()} />)

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("names the parcel locker and the delivery method of a locker order", () => {
    renderWithProviders(
      <ShippingBlock
        order={buildAccountOrderDetail({ deliveryMethodName: "Paczkomat InPost", lockerId: "WAW01A", shippingAddress: SHIPPING_ADDRESS })}
      />,
    )

    expect(screen.getByRole("heading", { name: "Pickup Point" })).toBeInTheDocument()
    expect(screen.getByText("WAW01A")).toHaveTextContent("WAW01A · Paczkomat InPost")
  })

  it("names the parcel locker alone when the delivery method is unknown", () => {
    renderWithProviders(<ShippingBlock order={buildAccountOrderDetail({ lockerId: "WAW01A" })} />)

    expect(screen.getByText("WAW01A")).toHaveTextContent(/^WAW01A$/u)
  })
})
