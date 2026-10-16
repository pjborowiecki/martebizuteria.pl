import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { TEST_SELLER_DETAILS, createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { SOCIALS } from "~/src/presentation/branding/socials"

import { Footer } from "~/src/presentation/components/custom/pages/landing-page/footer/footer"

import { ABOUT_CONTACT_HASH, ROUTES } from "~/src/routes"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

describe("Footer", () => {
  afterEach(() => {
    cleanup()
  })

  it("leads with the brand name and its description", () => {
    renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("heading", { level: 2, name: "M'Arte" })).toBeInTheDocument()
    expect(
      screen.getByText("Handcrafted jewelry made of natural stones and 925 sterling silver. Each piece is a unique work of art."),
    ).toBeInTheDocument()
  })

  it.each([["Information"], ["Legal"], ["Tips"], ["Seller and contact"]])("groups the footer under the %s heading", (name) => {
    renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

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
    renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href)
  })

  it("shows the stored seller's identity and how to reach it on every page", () => {
    renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByText(TEST_SELLER_DETAILS.legalName, { exact: false })).toHaveTextContent(
      `${TEST_SELLER_DETAILS.street} ${TEST_SELLER_DETAILS.postalCode} ${TEST_SELLER_DETAILS.city}`,
    )
    expect(screen.getByText(TEST_SELLER_DETAILS.regon, { exact: false })).toHaveTextContent(TEST_SELLER_DETAILS.nip)
    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.email })).toHaveAttribute("href", `mailto:${TEST_SELLER_DETAILS.email}`)
    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.phone })).toHaveAttribute("href", "tel:+48600100200")
  })

  it.each([
    ["Instagram", SOCIALS.INSTAGRAM],
    ["Facebook", SOCIALS.FACEBOOK],
  ])("opens the %s profile in a new tab without leaking the referrer", (name, href) => {
    renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })
    const link = screen.getByRole("link", { name })

    expect(link).toHaveAttribute("href", href)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("names each social icon for assistive technology", () => {
    const { container } = renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

    expect([...container.querySelectorAll("svg > title")].map((title) => title.textContent)).toStrictEqual(["Instagram", "Facebook"])
  })

  it("closes with the copyright line", () => {
    renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByText("© 2026 M'Arte. All rights reserved.")).toBeInTheDocument()
  })

  it("puts every navigation link in a list item", () => {
    const { container } = renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

    expect(container.querySelectorAll("li")).toHaveLength(8)
  })

  it("gives every link and social icon a finger-sized target on touch screens", () => {
    renderWithProviders(<Footer />, { queryClient: createSellerDetailsQueryClient() })

    const terms = screen.getByRole("link", { name: "Store regulations" })

    expect(terms).toHaveClass("pointer-coarse:inline-block", "pointer-coarse:py-2.5")
    expect(terms.closest("ul")).toHaveClass("space-y-3", "pointer-coarse:space-y-0")
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveClass("pointer-coarse:size-10")
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveClass("pointer-coarse:size-10")
  })
})
