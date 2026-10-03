import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

interface RouteDefinition {
  readonly component?: () => JSX.Element
}

const captured = vi.hoisted(() => new Map<string, RouteDefinition>())

const loader = vi.hoisted(() => ({
  data: { email: "", result: "invalid" } as { email: string; result: Newsletter["tokenResult"]["result"] },
}))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createFileRoute: (path: string) => (options: RouteDefinition) => {
    captured.set(path, options)

    return { options, useLoaderData: () => loader.data }
  },
}))
vi.mock("~/src/modules/newsletter/use-cases/confirm-newsletter-subscription", () => ({ confirmNewsletterSubscription: vi.fn() }))
vi.mock("~/src/modules/newsletter/use-cases/unsubscribe-from-newsletter", () => ({ unsubscribeFromNewsletter: vi.fn() }))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"

await import("~/src/routes/_storefront.newsletter.confirm")
await import("~/src/routes/_storefront.newsletter.unsubscribe")

const CONFIRM_PATH = "/_storefront/newsletter/confirm"

const UNSUBSCRIBE_PATH = "/_storefront/newsletter/unsubscribe"

const renderPage = (path: string, data: { email: string; result: Newsletter["tokenResult"]["result"] }) => {
  loader.data = data
  const Page = captured.get(path)?.component
  if (Page === undefined) {
    throw new Error(`the ${path} route renders no component`)
  }

  return renderWithProviders(<Page />)
}

afterEach(cleanup)

describe("newsletter confirmation page", () => {
  it("welcomes the subscriber by the address they just confirmed", () => {
    renderPage(CONFIRM_PATH, { email: "anna@example.com", result: NEWSLETTER_TOKEN_RESULT.OK })

    expect(screen.getByRole("heading", { level: 1, name: "You are on the list" })).toBeInTheDocument()
    expect(
      screen.getByText("Thank you for confirming anna@example.com. Letters from the atelier will arrive from time to time, never often."),
    ).toBeInTheDocument()
  })

  it("reassures a subscriber who follows the link a second time", () => {
    renderPage(CONFIRM_PATH, { email: "anna@example.com", result: NEWSLETTER_TOKEN_RESULT.ALREADY_DONE })

    expect(screen.getByRole("heading", { level: 1, name: "Already confirmed" })).toBeInTheDocument()
    expect(screen.getByText("anna@example.com is already on the list, so there is nothing more to do.")).toBeInTheDocument()
  })

  it("explains how to get a fresh link when this one is no longer valid", () => {
    renderPage(CONFIRM_PATH, { email: "", result: NEWSLETTER_TOKEN_RESULT.INVALID })

    expect(screen.getByRole("heading", { level: 1, name: "This link is no longer valid" })).toBeInTheDocument()
    expect(screen.getByText(/Subscribe again from the home page and we will send a fresh link\./u)).toBeInTheDocument()
  })

  it("offers the way back to the store", () => {
    renderPage(CONFIRM_PATH, { email: "anna@example.com", result: NEWSLETTER_TOKEN_RESULT.OK })

    expect(screen.getByRole("link", { name: "Return to store" })).toHaveAttribute("href", "/")
  })
})

describe("newsletter unsubscribe page", () => {
  it("confirms which address has left the list", () => {
    renderPage(UNSUBSCRIBE_PATH, { email: "anna@example.com", result: NEWSLETTER_TOKEN_RESULT.OK })

    expect(screen.getByRole("heading", { level: 1, name: "You have left the list" })).toBeInTheDocument()
    expect(
      screen.getByText("anna@example.com will receive no further letters. You are welcome back whenever you like."),
    ).toBeInTheDocument()
  })

  it("says nothing changed when the address had already left", () => {
    renderPage(UNSUBSCRIBE_PATH, { email: "anna@example.com", result: NEWSLETTER_TOKEN_RESULT.ALREADY_DONE })

    expect(screen.getByRole("heading", { level: 1, name: "Already unsubscribed" })).toBeInTheDocument()
    expect(screen.getByText("anna@example.com had already left the list, so nothing changed.")).toBeInTheDocument()
  })

  it("tells the reader how to be removed when the link matches no subscription", () => {
    renderPage(UNSUBSCRIBE_PATH, { email: "", result: NEWSLETTER_TOKEN_RESULT.INVALID })

    expect(screen.getByRole("heading", { level: 1, name: "This link is no longer valid" })).toBeInTheDocument()
    expect(screen.getByText(/reply to one and we will remove you by hand\./u)).toBeInTheDocument()
  })

  it("offers the way back to the store", () => {
    renderPage(UNSUBSCRIBE_PATH, { email: "anna@example.com", result: NEWSLETTER_TOKEN_RESULT.OK })

    expect(screen.getByRole("link", { name: "Return to store" })).toHaveAttribute("href", "/")
  })
})
