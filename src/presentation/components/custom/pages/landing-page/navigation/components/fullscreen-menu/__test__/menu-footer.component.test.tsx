import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SOCIALS } from "~/src/presentation/branding/socials"

import { MenuFooter } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/menu-footer"

afterEach(() => {
  cleanup()
})

describe("MenuFooter", () => {
  it("shows the brand tagline", () => {
    renderWithProviders(<MenuFooter />)

    expect(screen.getByText("M'ARTE © 2026")).toBeInTheDocument()
  })

  it("links out to Instagram in a new tab", () => {
    renderWithProviders(<MenuFooter />)
    const link = screen.getByRole("link", { name: "Instagram" })

    expect(link).toHaveAttribute("href", SOCIALS.INSTAGRAM)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("links out to Facebook in a new tab", () => {
    renderWithProviders(<MenuFooter />)
    const link = screen.getByRole("link", { name: "Facebook" })

    expect(link).toHaveAttribute("href", SOCIALS.FACEBOOK)
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("hides the Facebook link on the narrowest screens", () => {
    renderWithProviders(<MenuFooter />)

    expect(screen.getByRole("link", { name: "Facebook" })).toHaveClass("hidden", "sm:block")
    expect(screen.getByRole("link", { name: "Instagram" })).not.toHaveClass("hidden")
  })
})
