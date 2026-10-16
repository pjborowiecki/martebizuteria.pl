import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import {
  SHIPPING_ADDRESS,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderSummaryParties } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-parties"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

afterEach(() => {
  cleanup()
})

const section = (heading: string): HTMLElement => {
  const container = screen.getByRole("heading", { level: 2, name: heading }).closest("section")
  if (container === null) {
    throw new Error(`No section is headed ${heading}`)
  }

  return container
}

describe("OrderSummaryParties seller", () => {
  it("names the seller stored in the settings with its legal name, address, NIP and email", () => {
    renderWithProviders(<OrderSummaryParties order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })
    const seller = within(section("Seller"))

    expect(seller.getByText("Pracownia Testowa Anna Nowak")).toBeInTheDocument()
    expect(seller.getByText("ul. Floriańska 1")).toBeInTheDocument()
    expect(seller.getByText("31-001 Kraków")).toBeInTheDocument()
    expect(seller.getByText("Poland")).toBeInTheDocument()
    expect(seller.getByText("NIP 5260250274")).toBeInTheDocument()
    expect(seller.getByText("sklep@marte.test")).toBeInTheDocument()
  })
})

describe("OrderSummaryParties buyer", () => {
  it("names the company and NIP a business buyer gave above their billing address", () => {
    renderWithProviders(
      <OrderSummaryParties
        order={buildAdminOrderDetail({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" })}
      />,
      { queryClient: createSellerDetailsQueryClient() },
    )
    const buyer = within(section("Buyer"))

    expect(buyer.getByText("Pracownia Złotnicza sp. z o.o.")).toBeInTheDocument()
    expect(buyer.getByText("NIP 5260001246")).toBeInTheDocument()
    expect(buyer.getByText(SHIPPING_ADDRESS.line1)).toBeInTheDocument()
    expect(buyer.getByText("anna@example.com")).toBeInTheDocument()
  })

  it("shows a private buyer's billing address with no company or NIP", () => {
    renderWithProviders(<OrderSummaryParties order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })
    const buyer = within(section("Buyer"))

    expect(buyer.getByText(SHIPPING_ADDRESS.name)).toBeInTheDocument()
    expect(buyer.queryByText(/^NIP /u)).toBeNull()
  })

  it("names the customer when the order kept no billing address", () => {
    renderWithProviders(<OrderSummaryParties order={buildAdminOrderDetail({ billingAddress: undefined })} />, {
      queryClient: createSellerDetailsQueryClient(),
    })
    const buyer = within(section("Buyer"))

    expect(buyer.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(buyer.queryByText(SHIPPING_ADDRESS.line1)).toBeNull()
  })
})
