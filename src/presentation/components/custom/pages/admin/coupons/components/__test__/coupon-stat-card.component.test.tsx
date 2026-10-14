import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CouponStatCard } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupon-stat-card"
import { COUPON_STAT_CARDS, type CouponStatCardConfig } from "~/src/presentation/components/custom/pages/admin/coupons/coupons-stats.config"

const LARGE_TOTAL = "12 345,67 zł"

const redeemedTotalCard = (): CouponStatCardConfig => {
  const config = COUPON_STAT_CARDS.find((candidate) => candidate.key === "redeemedTotalMinorUnits")
  if (config === undefined) {
    throw new Error("No coupon stat card is configured for the redeemed total")
  }

  return config
}

afterEach(cleanup)

describe("CouponStatCard", () => {
  it("cuts a large redeemed total short beside its icon instead of running under it", () => {
    renderWithProviders(<CouponStatCard config={redeemedTotalCard()} displayValue={LARGE_TOTAL} pressed={false} valuesPending={false} />)

    expect(screen.getByText(LARGE_TOTAL)).toHaveClass("min-w-0", "truncate")
  })

  it("hides the value behind a placeholder while the stats are loading", () => {
    renderWithProviders(<CouponStatCard config={redeemedTotalCard()} displayValue={LARGE_TOTAL} pressed={false} valuesPending />)

    expect(screen.queryByText(LARGE_TOTAL)).not.toBeInTheDocument()
  })
})
