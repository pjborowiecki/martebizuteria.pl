import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SOCIALS } from "~/src/presentation/branding/socials"

import { Footer } from "~/src/presentation/components/custom/pages/landing-page/footer/footer"

import { ROUTES } from "~/src/routes"

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

  it.each([["Information"], ["Legal"], ["Tips"]])("groups the links under the %s heading", (name) => {
    renderWithProviders(<Footer />)

    expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument()
  })

  it.each([
    ["Who we are", ROUTES.ABOUT],
    ["Contact details", ROUTES.ABOUT],
    ["Customer panel", ROUTES.ACCOUNT],
    ["Store regulations", ROUTES.TERMS_OF_SERVICE],
    ["Privacy policy", ROUTES.PRIVACY_POLICY],
    ["Exchanges and returns", ROUTES.EXCHANGES_AND_RETURNS],
    ["How to care for jewelry", ROUTES.FAQ],
  ])("sends %s to %s", (name, href) => {
    renderWithProviders(<Footer />)

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href)
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

    expect(container.querySelectorAll("li")).toHaveLength(7)
  })
})
