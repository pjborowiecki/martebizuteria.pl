import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DeliveryInStore } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/store/delivery-in-store"

describe("DeliveryInStore", () => {
  afterEach(cleanup)

  it("uses the translated heading rather than the inline fallback", () => {
    renderWithProviders(<DeliveryInStore />)

    expect(screen.getByText("In-store Pickup")).toBeInTheDocument()
    expect(screen.queryByText("Odbiór Osobisty")).not.toBeInTheDocument()
  })

  it("explains the pickup and when the order is ready, as the terms of service state it, in the shopper's language", () => {
    renderWithProviders(<DeliveryInStore />)

    expect(
      screen.getByText(
        "Collect your order at our shop in Bochnia, ul. Wąska 11, between 09:00 and 17:00. It will be ready by the end of the fulfillment time stated on the product page, or the longest of them if you order several products, and we will let you know as soon as it is.",
      ),
    ).toBeInTheDocument()
  })
})
