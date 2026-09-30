import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { getDiscountStats } = vi.hoisted(() => ({ getDiscountStats: vi.fn() }))

vi.mock("~/src/modules/discount/use-cases/get-admin-discount-stats", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getDiscountStatsQuery: () => queryOptions({ queryFn: getDiscountStats, queryKey: ["admin", "discounts", "stats"] }),
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildStats } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { CouponStats } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-stats"

beforeEach(() => {
  vi.clearAllMocks()
  getDiscountStats.mockResolvedValue(buildStats())
})

afterEach(cleanup)

describe("CouponStats", () => {
  it("labels each figure", async () => {
    renderWithProviders(<CouponStats />)

    expect(await screen.findByText("Active coupons")).toBeInTheDocument()
    for (const label of ["Total coupons", "Redemptions", "Given away"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("reports the counts the database returned", async () => {
    renderWithProviders(<CouponStats />)

    expect(await screen.findByText("3")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("formats the money given away as currency", async () => {
    renderWithProviders(<CouponStats />)

    expect(await screen.findByText("PLN 1,245.00")).toBeInTheDocument()
  })

  it("shows zeroes rather than blanks for a store with no coupons", async () => {
    getDiscountStats.mockResolvedValue(buildStats({ active: 0, redeemedTotalMinorUnits: 0, redemptions: 0, total: 0 }))
    renderWithProviders(<CouponStats />)

    expect(await screen.findByText("Active coupons")).toBeInTheDocument()
    expect(screen.getAllByText("0")).toHaveLength(3)
  })
})
