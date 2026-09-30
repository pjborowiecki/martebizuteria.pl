import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { MARKETING_STATS } from "~/src/data/marketing"

import { MarketingStats } from "~/src/presentation/components/custom/pages/admin/marketing/marketing-stats"

describe("MarketingStats", () => {
  afterEach(cleanup)

  it("renders one card per marketing stat", () => {
    const { container } = renderWithProviders(<MarketingStats />)

    expect(container.querySelectorAll("[data-slot='card']")).toHaveLength(MARKETING_STATS.length)
  })

  it.each([
    ["totalCampaigns", "Total Campaigns", "12"],
    ["activeCampaigns", "Active Campaigns", "3"],
    ["totalReach", "Total Reach", "19.4K"],
    ["totalRevenue", "Total Revenue", "$85,200"],
  ])("translates the %s label and value", (_key, label, value) => {
    renderWithProviders(<MarketingStats />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(value)).toBeInTheDocument()
  })

  it.each([...MARKETING_STATS])("shows the $key trend", ({ trend }) => {
    renderWithProviders(<MarketingStats />)

    expect(screen.getByText(trend)).toBeInTheDocument()
  })

  it("renders every trend as an upward move for the current data", () => {
    const { container } = renderWithProviders(<MarketingStats />)

    expect(container.querySelectorAll(".lucide-arrow-up-right")).toHaveLength(MARKETING_STATS.length)
    expect(container.querySelectorAll(".lucide-arrow-down-right")).toHaveLength(0)
  })

  it("gives each sparkline its own gradient id so the cards do not share fills", () => {
    const { container } = renderWithProviders(<MarketingStats />)

    expect([...container.querySelectorAll("linearGradient")].map((gradient) => gradient.id)).toStrictEqual(
      MARKETING_STATS.map((stat) => `mkt-grad-${stat.key}`),
    )
  })
})
