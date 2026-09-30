import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { COUPON_STATS } from "~/src/data/coupons"

import { CouponStats } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-stats"

afterEach(() => {
  cleanup()
})

describe("CouponStats", () => {
  it("renders one card per coupon statistic", () => {
    const { container } = renderWithProviders(<CouponStats />)

    expect(container.querySelectorAll("[data-slot='card']")).toHaveLength(COUPON_STATS.length)
  })

  it("translates every card label from the admin namespace", () => {
    renderWithProviders(<CouponStats />)

    expect(screen.getByText("Active Coupons")).toBeInTheDocument()
    expect(screen.getByText("Total Redemptions")).toBeInTheDocument()
    expect(screen.getByText("Revenue Saved")).toBeInTheDocument()
    expect(screen.getByText("Avg Discount")).toBeInTheDocument()
  })

  it("shows the translated value beside each label", () => {
    renderWithProviders(<CouponStats />)

    expect(screen.getByText("18")).toBeInTheDocument()
    expect(screen.getByText("1,492")).toBeInTheDocument()
    expect(screen.getByText("$12,450")).toBeInTheDocument()
    expect(screen.getByText("18%")).toBeInTheDocument()
  })

  it("prints the trend of every statistic", () => {
    renderWithProviders(<CouponStats />)

    for (const stat of COUPON_STATS) {
      expect(screen.getByText(stat.trend)).toBeInTheDocument()
    }
  })

  it("colours a rising trend green and a falling trend red", () => {
    renderWithProviders(<CouponStats />)

    expect(screen.getByText("+12.5%")).toHaveClass("text-emerald-600")
    expect(screen.getByText("-1.5%")).toHaveClass("text-red-500")
  })

  it("gives each sparkline its own gradient id, so the charts never share a fill", () => {
    const { container } = renderWithProviders(<CouponStats />)
    const gradientIds = [...container.querySelectorAll("linearGradient")].map((gradient) => gradient.id)

    expect(gradientIds).toStrictEqual(COUPON_STATS.map((stat) => `cpn-grad-${stat.key}`))
  })
})
