import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/_storefront.about"

import { BUSINESS, BUSINESS_PHONE_HREF, BUSINESS_POSTAL_ADDRESS_LINES } from "~/src/presentation/branding/business"

import { ABOUT_CONTACT_HASH } from "~/src/routes"

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
    renderWithProviders(<AboutPage />)

    expect(screen.getByRole("heading", { level: 1, name: "About M'Arte" })).toBeInTheDocument()
    expect(screen.getByText("About the brand")).toBeInTheDocument()
  })

  it("opens with where the jewellery is made and how long the workshop has worked", () => {
    renderWithProviders(<AboutPage />)

    expect(
      screen.getByText("M'ARTE is jewellery made in Bochnia, in a goldsmith's workshop that has been working since 1978."),
    ).toBeInTheDocument()
  })

  it("tells the whole brand story rather than announcing an unfinished page", () => {
    renderWithProviders(<AboutPage />)

    expect(screen.getByText(/We make forms in silver and gold/u)).toBeInTheDocument()
    expect(screen.getByText(/For us jewellery is more than an accessory/u)).toBeInTheDocument()
    expect(screen.getByText(/We like simple forms, the imperfections of natural materials/u)).toBeInTheDocument()
    expect(screen.getByText(/we make bespoke jewellery to order as well/u)).toBeInTheDocument()
    expect(screen.queryByText(/under construction/iu)).not.toBeInTheDocument()
  })

  it("ends with the seller's contact details where the contact links land", () => {
    renderWithProviders(<AboutPage />)
    const contact = screen.getByRole("region", { name: "Contact details" })

    expect(contact).toHaveAttribute("id", ABOUT_CONTACT_HASH)
    expect(contact).toHaveTextContent([...BUSINESS_POSTAL_ADDRESS_LINES, "Poland"].join(" "))
    expect(contact).toHaveTextContent(`NIP (tax identification number): ${BUSINESS.NIP}`)
    expect(contact).toHaveTextContent(`REGON (business statistics number): ${BUSINESS.REGON}`)
    expect(
      screen.getByText("Write or call us with any question about an order, a piece of jewellery or a bespoke design."),
    ).toBeInTheDocument()
  })

  it("keeps the reader on the page, offering only the seller's email address and phone number", () => {
    renderWithProviders(<AboutPage />)

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      `mailto:${BUSINESS.EMAIL}`,
      BUSINESS_PHONE_HREF,
    ])
  })
})

describe("storefront about route", () => {
  it("loads only the about namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.about"] })
  })
})
