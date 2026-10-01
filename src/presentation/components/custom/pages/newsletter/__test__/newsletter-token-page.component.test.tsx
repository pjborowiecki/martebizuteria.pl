import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewsletterTokenPage } from "~/src/presentation/components/custom/pages/newsletter/newsletter-token-page"

afterEach(cleanup)

describe("NewsletterTokenPage", () => {
  it("heads the page with the outcome and explains it", () => {
    renderWithProviders(
      <NewsletterTokenPage
        description="Thank you for confirming anna@example.com."
        linkLabel="Return to store"
        result="ok"
        title="You are on the list"
      />,
    )

    expect(screen.getByRole("heading", { name: "You are on the list" })).toBeInTheDocument()
    expect(screen.getByText("Thank you for confirming anna@example.com.")).toBeInTheDocument()
  })

  it.each(["ok", "alreadyDone"] as const)("marks the %s outcome as a success", (result) => {
    renderWithProviders(<NewsletterTokenPage description="done" linkLabel="Return to store" result={result} title="Done" />)

    expect(document.querySelector(".text-success")).not.toBeNull()
  })

  it("marks a spent or unknown link as unsuccessful", () => {
    renderWithProviders(
      <NewsletterTokenPage description="try again" linkLabel="Return to store" result="invalid" title="This link is no longer valid" />,
    )

    expect(document.querySelector(".text-success")).toBeNull()
  })

  it("always offers a way back to the storefront", () => {
    renderWithProviders(<NewsletterTokenPage description="done" linkLabel="Return to store" result="ok" title="Done" />)

    expect(screen.getByRole("link", { name: "Return to store" }).getAttribute("href")).toBe("/")
  })
})
