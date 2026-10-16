import { QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { TEST_SELLER_DETAILS, createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { SellerContactDetails } from "~/src/presentation/components/custom/seller-contact-details"

import polishCustomMessages from "~/messages/pl-PL/components.custom.json"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

const renderDetails = (className = "") =>
  renderWithProviders(<SellerContactDetails className={className} />, { queryClient: createSellerDetailsQueryClient() })

afterEach(cleanup)

describe("SellerContactDetails", () => {
  it("gives the stored seller's legal name and postal address with the country", () => {
    renderDetails()

    expect(screen.getByText("Pracownia Testowa Anna Nowak ul. Floriańska 1 31-001 Kraków Poland")).toBeInTheDocument()
  })

  it("identifies the seller by NIP and REGON", () => {
    renderDetails()

    expect(
      screen.getByText(
        `NIP (tax identification number): ${TEST_SELLER_DETAILS.nip} REGON (business statistics number): ${TEST_SELLER_DETAILS.regon}`,
      ),
    ).toBeInTheDocument()
  })

  it("lets the shopper write to or call the seller", () => {
    renderDetails()

    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.email })).toHaveAttribute("href", `mailto:${TEST_SELLER_DETAILS.email}`)
    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.phone })).toHaveAttribute("href", "tel:+48600100200")
  })

  it("gives the e-mail and phone links finger-sized targets on touch screens", () => {
    renderDetails()

    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.email })).toHaveClass(
      "pointer-coarse:inline-flex",
      "pointer-coarse:min-h-10",
    )
    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.phone })).toHaveClass(
      "pointer-coarse:inline-flex",
      "pointer-coarse:min-h-10",
    )
  })

  it("keeps the details in one address block laid out by the caller", () => {
    const { container } = renderDetails("md:grid-cols-3")

    expect(container.querySelector("address")).toHaveClass("grid", "md:grid-cols-3")
  })

  it("labels every detail in Polish for the Polish storefront", () => {
    render(
      <QueryClientProvider client={createSellerDetailsQueryClient()}>
        <IntlProvider locale="pl-PL" messages={{ components: { custom: polishCustomMessages } }}>
          <SellerContactDetails className="" />
        </IntlProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText("Pracownia Testowa Anna Nowak ul. Floriańska 1 31-001 Kraków Polska")).toBeInTheDocument()
    expect(screen.getByText(`NIP: ${TEST_SELLER_DETAILS.nip} REGON: ${TEST_SELLER_DETAILS.regon}`)).toBeInTheDocument()
  })
})
