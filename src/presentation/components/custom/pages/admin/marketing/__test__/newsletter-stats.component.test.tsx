import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/modules/newsletter-subscriber/use-cases/get-newsletter-stats", () => ({
  getNewsletterStatsQuery: () => ({
    queryFn: () => Promise.resolve({ confirmed: 1234, pending: 3, total: 1242, unsubscribed: 5 }),
    queryKey: ["admin", "newsletter", "stats"],
  }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewsletterStats } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-stats"

afterEach(cleanup)

describe("NewsletterStats", () => {
  it("counts the subscribers a newsletter reaches, those still to confirm and those who left", async () => {
    renderWithProviders(<NewsletterStats />)

    const confirmed = await screen.findByText("Confirmed subscribers")

    expect(confirmed.nextSibling).toHaveTextContent("1,234")
    expect(screen.getByText("Awaiting confirmation").nextSibling).toHaveTextContent("3")
    expect(screen.getByText("Unsubscribed").nextSibling).toHaveTextContent("5")
  })

  it("opens the subscriber list narrowed to the status a card counts", async () => {
    renderWithProviders(<NewsletterStats />)

    expect(await screen.findByRole("link", { name: /Confirmed subscribers/u })).toHaveAttribute(
      "href",
      "/admin/marketing/subscribers?status=confirmed",
    )
    expect(screen.getByRole("link", { name: /Awaiting confirmation/u })).toHaveAttribute(
      "href",
      "/admin/marketing/subscribers?status=pending",
    )
    expect(screen.getByRole("link", { name: /Unsubscribed/u })).toHaveAttribute("href", "/admin/marketing/subscribers?status=unsubscribed")
  })

  it("cuts a long count short beside its icon instead of running under it", async () => {
    renderWithProviders(<NewsletterStats />)

    expect(await screen.findByText("1,234")).toHaveClass("min-w-0", "truncate")
  })
})
