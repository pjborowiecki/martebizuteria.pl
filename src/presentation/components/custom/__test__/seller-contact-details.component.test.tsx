import { cleanup, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { BUSINESS, BUSINESS_PHONE_HREF, BUSINESS_POSTAL_ADDRESS_LINES } from "~/src/presentation/branding/business"

import { SellerContactDetails } from "~/src/presentation/components/custom/seller-contact-details"

import polishCustomMessages from "~/messages/pl-PL/components.custom.json"

afterEach(cleanup)

describe("SellerContactDetails", () => {
  it("gives the seller's legal name and postal address with the country", () => {
    renderWithProviders(<SellerContactDetails className="" />)

    expect(screen.getByText([...BUSINESS_POSTAL_ADDRESS_LINES, "Poland"].join(" "))).toBeInTheDocument()
  })

  it("identifies the seller by NIP and REGON", () => {
    renderWithProviders(<SellerContactDetails className="" />)

    expect(
      screen.getByText(`NIP (tax identification number): ${BUSINESS.NIP} REGON (business statistics number): ${BUSINESS.REGON}`),
    ).toBeInTheDocument()
  })

  it("lets the shopper write to or call the seller", () => {
    renderWithProviders(<SellerContactDetails className="" />)

    expect(screen.getByRole("link", { name: BUSINESS.EMAIL })).toHaveAttribute("href", `mailto:${BUSINESS.EMAIL}`)
    expect(screen.getByRole("link", { name: BUSINESS.PHONE })).toHaveAttribute("href", BUSINESS_PHONE_HREF)
  })

  it("keeps the details in one address block laid out by the caller", () => {
    const { container } = renderWithProviders(<SellerContactDetails className="md:grid-cols-3" />)

    expect(container.querySelector("address")).toHaveClass("grid", "md:grid-cols-3")
  })

  it("labels every detail in Polish for the Polish storefront", () => {
    render(
      <IntlProvider locale="pl-PL" messages={{ components: { custom: polishCustomMessages } }}>
        <SellerContactDetails className="" />
      </IntlProvider>,
    )

    expect(screen.getByText([...BUSINESS_POSTAL_ADDRESS_LINES, "Polska"].join(" "))).toBeInTheDocument()
    expect(screen.getByText(`NIP: ${BUSINESS.NIP} REGON: ${BUSINESS.REGON}`)).toBeInTheDocument()
  })
})
