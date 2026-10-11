import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { BUSINESS, BUSINESS_PHONE_HREF } from "~/src/presentation/branding/business"
import { SOCIALS } from "~/src/presentation/branding/socials"

import { Footer } from "~/src/presentation/components/custom/pages/landing-page/footer/footer"

import { ABOUT_CONTACT_HASH, ROUTES } from "~/src/routes"

describe("Footer", () => {
  afterEach(() => {
    cleanup()
  })

  it("leads with the brand name and its description", () => {
    renderWithProviders(<Footer />)

    expect(screen.getByRole("heading", { level: 2, name: "M'Arte" })).toBeInTheDocument()
    expect(
      screen.getByText("Handcrafted jewelry made of natural stones and 925 sterling silver. Each piece is a unique work of art."),
    ).toBeInTheDocument()
  })

  it.each([["Information"], ["Legal"], ["Tips"], ["Seller and contact"]])("groups the footer under the %s heading", (name) => {
    renderWithProviders(<Footer />)

    expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument()
  })

  it.each([
    ["Who we are", ROUTES.ABOUT],
    ["Contact details", `${ROUTES.ABOUT}#${ABOUT_CONTACT_HASH}`],
    ["Customer panel", ROUTES.ACCOUNT],
    ["Store regulations", ROUTES.TERMS_OF_SERVICE],
    ["Privacy policy", ROUTES.PRIVACY_POLICY],
    ["Exchanges and returns", ROUTES.EXCHANGES_AND_RETURNS],
    ["Withdraw from the contract", ROUTES.WITHDRAW_FROM_CONTRACT],
    ["How to care for jewelry", ROUTES.FAQ],
  ])("sends %s to %s", (name, href) => {
    renderWithProviders(<Footer />)

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href)
  })

  it("shows the seller's identity and how to reach it on every page", () => {
    renderWithProviders(<Footer />)

    expect(screen.getByText(BUSINESS.LEGAL_NAME, { exact: false })).toHaveTextContent(
      `${BUSINESS.STREET} ${BUSINESS.POSTAL_CODE} ${BUSINESS.CITY}`,
    )
    expect(screen.getByText(BUSINESS.REGON, { exact: false })).toHaveTextContent(BUSINESS.NIP)
    expect(screen.getByRole("link", { name: BUSINESS.EMAIL })).toHaveAttribute("href", `mailto:${BUSINESS.EMAIL}`)
    expect(screen.getByRole("link", { name: BUSINESS.PHONE })).toHaveAttribute("href", BUSINESS_PHONE_HREF)
  })

  it.each([
    ["Instagram", SOCIALS.INSTAGRAM],
    ["Facebook", SOCIALS.FACEBOOK],
  ])("opens the %s profile in a new tab without leaking the referrer", (name, href) => {
    renderWithProviders(<Footer />)
    const link = screen.getByRole("link", { name })

    expect(link).toHaveAttribute("href", href)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("names each social icon for assistive technology", () => {
    const { container } = renderWithProviders(<Footer />)

    expect([...container.querySelectorAll("svg > title")].map((title) => title.textContent)).toStrictEqual(["Instagram", "Facebook"])
  })

  it("closes with the copyright line", () => {
    renderWithProviders(<Footer />)

    expect(screen.getByText("© 2026 M'Arte. All rights reserved.")).toBeInTheDocument()
  })

  it("puts every navigation link in a list item", () => {
    const { container } = renderWithProviders(<Footer />)

    expect(container.querySelectorAll("li")).toHaveLength(8)
  })
})
