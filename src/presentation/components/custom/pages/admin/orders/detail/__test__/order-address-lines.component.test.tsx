import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SHIPPING_ADDRESS } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderAddressLines } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-address-lines"

afterEach(cleanup)

const renderedLines = (container: HTMLElement): (string | null)[] => [...container.querySelectorAll("p")].map((line) => line.textContent)

describe("OrderAddressLines", () => {
  it("prints the recipient, street, postal code with city, country and phone line by line", () => {
    const { container } = renderWithProviders(<OrderAddressLines address={SHIPPING_ADDRESS} />)

    expect(renderedLines(container)).toStrictEqual(["Anna Kowalska", "ul. Mokotowska 12/4", "00-640 Warszawa", "PL", "+48 600 123 456"])
  })

  it("adds the second address line and the province when the address has them", () => {
    renderWithProviders(<OrderAddressLines address={{ ...SHIPPING_ADDRESS, line2: "lok. 4", province: "mazowieckie" }} />)

    expect(screen.getByText("lok. 4")).toBeInTheDocument()
    expect(screen.getByText("00-640 Warszawa, mazowieckie")).toBeInTheDocument()
  })

  it("prints the city alone and leaves the phone out when neither was captured", () => {
    const { container } = renderWithProviders(
      <OrderAddressLines address={{ ...SHIPPING_ADDRESS, phone: undefined, postalCode: undefined }} />,
    )

    expect(renderedLines(container)).toStrictEqual(["Anna Kowalska", "ul. Mokotowska 12/4", "Warszawa", "PL"])
  })
})
