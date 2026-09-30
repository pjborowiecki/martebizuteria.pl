import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewsletterSection } from "~/src/presentation/components/custom/pages/landing-page/sections/newsletter-section"

describe("NewsletterSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow, heading and description", () => {
    renderWithProviders(<NewsletterSection />)

    expect(screen.getByText("Newsletter")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Stay close to M'ARTE" })).toBeInTheDocument()
    expect(screen.getByText(/Stay up to date with new products/u)).toBeInTheDocument()
  })

  it("labels the email field with the same text it uses as placeholder", () => {
    renderWithProviders(<NewsletterSection />)

    const field = screen.getByLabelText("Email address")

    expect(field).toHaveAttribute("placeholder", "Email address")
  })

  it("renders the join button and the consent note", () => {
    renderWithProviders(<NewsletterSection />)

    expect(screen.getByRole("button", { name: "Join us" })).toHaveAttribute("type", "button")
    expect(screen.getByText(/you agree to the processing of data for marketing purposes/u)).toBeInTheDocument()
  })
})
