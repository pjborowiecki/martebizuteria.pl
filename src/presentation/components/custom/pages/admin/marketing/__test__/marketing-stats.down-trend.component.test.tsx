import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as MarketingData from "~/src/data/marketing"

vi.mock("~/src/data/marketing", async (importOriginal) => ({
  ...(await importOriginal<typeof MarketingData>()),
  MARKETING_STATS: [
    {
      color: "hsl(221 83% 53%)",
      key: "totalRevenue",
      spark: [{ v: 112_000 }, { v: 104_000 }, { v: 95_000 }],
      trend: "-8.2%",
      up: false,
    },
  ],
}))

import { MarketingStats } from "~/src/presentation/components/custom/pages/admin/marketing/marketing-stats"

afterEach(cleanup)

describe("MarketingStats for a metric that fell", () => {
  it("points the trend arrow downwards instead of upwards", () => {
    const { container } = renderWithProviders(<MarketingStats />)

    expect(screen.getByText("-8.2%")).toBeInTheDocument()
    expect(container.querySelectorAll(".lucide-arrow-down-right")).toHaveLength(1)
    expect(container.querySelectorAll(".lucide-arrow-up-right")).toHaveLength(0)
  })

  it("marks the falling trend in red rather than green", () => {
    renderWithProviders(<MarketingStats />)

    const trend = screen.getByText("-8.2%")

    expect(trend.className).toContain("text-red-500")
    expect(trend.className).not.toContain("text-emerald-600")
  })

  it("still labels the card and compares it against the previous period", () => {
    renderWithProviders(<MarketingStats />)

    expect(screen.getByText("Total Revenue")).toBeInTheDocument()
    expect(screen.getByText("$85,200")).toBeInTheDocument()
    expect(screen.getByText("vs previous 30 days")).toBeInTheDocument()
  })
})
