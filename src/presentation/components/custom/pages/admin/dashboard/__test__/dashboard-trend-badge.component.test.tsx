import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { DashboardTrendBadge } from "~/src/presentation/components/custom/pages/admin/dashboard/dashboard-trend-badge"

afterEach(() => {
  cleanup()
})

describe("DashboardTrendBadge", () => {
  it("signs a rising trend with a plus and the positive palette", () => {
    render(<DashboardTrendBadge trendPercent={12} />)

    const badge = screen.getByText("+12%")

    expect(badge).toHaveClass("text-emerald-700")
    expect(badge).not.toHaveClass("text-red-600")
  })

  it("leaves the minus sign of a falling trend alone and uses the negative palette", () => {
    render(<DashboardTrendBadge trendPercent={-8} />)

    const badge = screen.getByText("-8%")

    expect(badge).toHaveClass("text-red-600")
  })

  it("treats a flat trend as rising so zero reads as +0%", () => {
    render(<DashboardTrendBadge trendPercent={0} />)

    expect(screen.getByText("+0%")).toHaveClass("bg-emerald-50")
  })

  it("keeps the caller's extra classes alongside its own", () => {
    render(<DashboardTrendBadge className="ml-4" trendPercent={5} />)

    const badge = screen.getByText("+5%")

    expect(badge).toHaveClass("ml-4")
    expect(badge).toHaveClass("bg-emerald-50")
  })

  it("points the arrow down for a falling trend", () => {
    const { container } = render(<DashboardTrendBadge trendPercent={-3} />)

    expect(container.querySelector("svg")).toHaveClass("lucide-arrow-down-right")
  })

  it("points the arrow up for a rising trend", () => {
    const { container } = render(<DashboardTrendBadge trendPercent={3} />)

    expect(container.querySelector("svg")).toHaveClass("lucide-arrow-up-right")
  })
})
