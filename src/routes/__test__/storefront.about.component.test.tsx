import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { TEST_SELLER_DETAILS, createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { Route } from "~/src/routes/_storefront.about"

import { ABOUT_CONTACT_HASH } from "~/src/routes"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

const AboutPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the about route renders no component")
  }

  return <Page />
}

afterEach(cleanup)

describe("storefront about page", () => {
  it("titles the page after the atelier", () => {
    renderWithProviders(<AboutPage />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("heading", { level: 1, name: "About M'Arte" })).toBeInTheDocument()
    expect(screen.getByText("About the brand")).toBeInTheDocument()
  })

  it("opens with where the jewellery is made and how long the workshop has worked", () => {
    renderWithProviders(<AboutPage />, { queryClient: createSellerDetailsQueryClient() })

    expect(
      screen.getByText("M'ARTE is jewellery made in Bochnia, in a goldsmith's workshop that has been working since 1978."),
    ).toBeInTheDocument()
  })

  it("tells the whole brand story rather than announcing an unfinished page", () => {
    renderWithProviders(<AboutPage />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByText(/We make forms in silver and gold/u)).toBeInTheDocument()
    expect(screen.getByText(/For us jewellery is more than an accessory/u)).toBeInTheDocument()
    expect(screen.getByText(/We like simple forms, the imperfections of natural materials/u)).toBeInTheDocument()
    expect(screen.getByText(/we make bespoke jewellery to order as well/u)).toBeInTheDocument()
    expect(screen.queryByText(/under construction/iu)).not.toBeInTheDocument()
  })

  it("ends with the seller's contact details where the contact links land", () => {
    renderWithProviders(<AboutPage />, { queryClient: createSellerDetailsQueryClient() })
    const contact = screen.getByRole("region", { name: "Contact details" })

    expect(contact).toHaveAttribute("id", ABOUT_CONTACT_HASH)
    expect(contact).toHaveTextContent("Pracownia Testowa Anna Nowak ul. Floriańska 1 31-001 Kraków Poland")
    expect(contact).toHaveTextContent(`NIP (tax identification number): ${TEST_SELLER_DETAILS.nip}`)
    expect(contact).toHaveTextContent(`REGON (business statistics number): ${TEST_SELLER_DETAILS.regon}`)
    expect(
      screen.getByText("Write or call us with any question about an order, a piece of jewellery or a bespoke design."),
    ).toBeInTheDocument()
  })

  it("keeps the reader on the page, offering only the seller's email address and phone number", () => {
    renderWithProviders(<AboutPage />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      `mailto:${TEST_SELLER_DETAILS.email}`,
      "tel:+48600100200",
    ])
  })
})

describe("storefront about route", () => {
  it("loads only the about namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.about"] })
  })
})
