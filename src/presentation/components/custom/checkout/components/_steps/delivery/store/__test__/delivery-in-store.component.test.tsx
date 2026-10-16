import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { DeliveryInStore } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/store/delivery-in-store"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

describe("DeliveryInStore", () => {
  afterEach(cleanup)

  it("uses the translated heading rather than the inline fallback", () => {
    renderWithProviders(<DeliveryInStore />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByText("In-store Pickup")).toBeInTheDocument()
    expect(screen.queryByText("Odbiór Osobisty")).not.toBeInTheDocument()
  })

  it("explains where to collect the order, at the seller's stored address, and when it is ready, in the shopper's language", () => {
    renderWithProviders(<DeliveryInStore />, { queryClient: createSellerDetailsQueryClient() })

    expect(
      screen.getByText(
        "Collect your order at our shop at ul. Floriańska 1, 31-001 Kraków, between 09:00 and 17:00. It will be ready by the end of the fulfillment time stated on the product page, or the longest of them if you order several products, and we will let you know as soon as it is.",
      ),
    ).toBeInTheDocument()
  })
})
