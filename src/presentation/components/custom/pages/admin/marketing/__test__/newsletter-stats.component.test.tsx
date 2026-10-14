import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/modules/newsletter/use-cases/get-newsletter-stats", () => ({
  getNewsletterStatsQuery: () => ({
    queryFn: () => Promise.resolve({ confirmed: 12, pending: 3, total: 20, unsubscribed: 5 }),
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

    expect(confirmed.nextSibling).toHaveTextContent("12")
    expect(screen.getByText("Awaiting confirmation").nextSibling).toHaveTextContent("3")
    expect(screen.getByText("Unsubscribed").nextSibling).toHaveTextContent("5")
  })

  it("cuts a long count short beside its icon instead of running under it", async () => {
    renderWithProviders(<NewsletterStats />)

    expect(await screen.findByText("12")).toHaveClass("min-w-0", "truncate")
  })
})
