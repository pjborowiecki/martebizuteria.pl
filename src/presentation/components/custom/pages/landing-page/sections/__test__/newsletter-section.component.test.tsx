import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { subscribe } = vi.hoisted(() => ({
  subscribe: vi.fn<(input: { email: string }) => Promise<{ outcome: string }>>(),
}))

vi.mock("~/src/modules/newsletter/use-cases/subscribe-to-newsletter", () => ({
  subscribeToNewsletterMutation: { mutationFn: subscribe, mutationKey: ["newsletter", "subscribe"] },
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewsletterSection } from "~/src/presentation/components/custom/pages/landing-page/sections/newsletter-section"

const submit = (email: string) => {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } })
  fireEvent.click(screen.getByRole("button", { name: /Join us/u }))
}

beforeEach(() => {
  vi.clearAllMocks()
  subscribe.mockResolvedValue({ outcome: "confirmationSent" })
})

afterEach(cleanup)

describe("NewsletterSection", () => {
  it("invites the visitor to join with the campaign copy", () => {
    renderWithProviders(<NewsletterSection />)

    expect(screen.getByText("Newsletter")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Stay close to M'ARTE" })).toBeInTheDocument()
  })

  it("sends the address to the subscribe server function", async () => {
    renderWithProviders(<NewsletterSection />)
    submit("anna@example.com")

    await screen.findByText(/check your inbox/u)
    expect(subscribe.mock.calls[0]?.[0]).toMatchObject({ email: "anna@example.com", source: "landing" })
  })

  it("asks the visitor to confirm by email rather than claiming they are subscribed", async () => {
    renderWithProviders(<NewsletterSection />)
    submit("anna@example.com")

    expect(await screen.findByText("Almost there — check your inbox and confirm your subscription.")).toBeInTheDocument()
  })

  it("says so when the signed-in visitor is already on the list", async () => {
    subscribe.mockResolvedValue({ outcome: "alreadyConfirmed" })
    renderWithProviders(<NewsletterSection />)
    submit("anna@example.com")

    expect(await screen.findByText("You are already on the list.")).toBeInTheDocument()
  })

  it("rejects a malformed address without calling the server", () => {
    renderWithProviders(<NewsletterSection />)
    submit("not-an-email")

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument()
    expect(subscribe).not.toHaveBeenCalled()
  })

  it("trims surrounding whitespace before submitting", async () => {
    renderWithProviders(<NewsletterSection />)
    submit("  anna@example.com  ")

    await screen.findByText(/check your inbox/u)
    expect(subscribe.mock.calls[0]?.[0]?.email).toBe("anna@example.com")
  })

  it("reports a failure instead of pretending the signup worked", async () => {
    subscribe.mockRejectedValue(new Error("boom"))
    renderWithProviders(<NewsletterSection />)
    submit("anna@example.com")

    expect(await screen.findByText("We could not sign you up just now. Please try again.")).toBeInTheDocument()
  })

  it("keeps the consent note visible alongside the form", () => {
    renderWithProviders(<NewsletterSection />)

    expect(screen.getByText(/agree to the processing of data/u)).toBeInTheDocument()
  })
})
