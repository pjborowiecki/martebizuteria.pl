import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/_storefront.faq"

const renderFaq = () => {
  const FaqPage = Route.options.component
  if (FaqPage === undefined) {
    throw new Error("the faq route registered no component")
  }

  return renderWithProviders(<FaqPage />)
}

afterEach(cleanup)

describe("faq page", () => {
  it("titles the page", () => {
    renderFaq()

    expect(screen.getByRole("heading", { level: 1, name: "FAQ" })).toBeInTheDocument()
  })

  it("admits the page is still being written", () => {
    renderFaq()

    expect(screen.getByText("Page under construction. We look forward to seeing you soon.")).toBeInTheDocument()
  })

  it("offers a way back to the home page", () => {
    renderFaq()

    const home = screen.getByRole("link", { name: "Go to home page" })
    expect(home).toBeInTheDocument()
    expect(home).toHaveAttribute("href")
  })
})
