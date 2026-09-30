import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const reads = vi.hoisted(() => ({
  batch: vi.fn<(queries: readonly unknown[]) => Promise<readonly (readonly unknown[])[]>>(),
  query: () => ({}),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: { batch: reads.batch } }))
vi.mock("~/src/modules/admin-dashboard/admin-dashboard.accessors", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  averageCompletedOrderValueQuery: reads.query,
  completedRevenueSumQuery: reads.query,
  countableOrdersQuery: reads.query,
  dailyOrderAggregatesQuery: reads.query,
  monthlyOrderAggregatesQuery: reads.query,
  newCustomersQuery: reads.query,
  pageViewsQuery: reads.query,
  recentOrdersQuery: reads.query,
  topProductsQuery: reads.query,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler:
        (handler: (options: { data: unknown }) => unknown) =>
        (options: { data: unknown }): unknown =>
          handler({ data: builder.validate(options.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import {
  ADMIN_DASHBOARD_CHART_DAYS_30,
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"
import { getDashboardSnapshot } from "~/src/modules/admin-dashboard/use-cases/get-dashboard-snapshot"

const BATCHED_READ_COUNT = 15

const ZERO_STAT = { current: 0, previous: 0, trendPercent: 0 }

const snapshot = (): Promise<AdminDashboard["snapshot"]> => getDashboardSnapshot({ data: { locale: "en-US" } })

beforeEach(() => {
  const empty = Array.from({ length: BATCHED_READ_COUNT }, () => [])
  reads.batch.mockReset().mockResolvedValue(empty)
})

describe("getDashboardSnapshot when a batched read yields no row", () => {
  it("shows a zero revenue, order and customer headline instead of an empty figure", async () => {
    const result = await snapshot()

    expect(result.revenue).toStrictEqual(ZERO_STAT)
    expect(result.orders).toStrictEqual(ZERO_STAT)
    expect(result.customers).toStrictEqual(ZERO_STAT)
  })

  it("shows a zero page view and average order value headline", async () => {
    const result = await snapshot()

    expect(result.pageViews).toStrictEqual(ZERO_STAT)
    expect(result.averageOrderValue).toStrictEqual(ZERO_STAT)
  })

  it("shows no revenue booked so far this year", async () => {
    const result = await snapshot()

    expect(result.yearToDateRevenueMinorUnits).toBe(0)
  })

  it("prices the empty dashboard in the store currency", async () => {
    const result = await snapshot()

    expect(result.currencyCode).toBe(STORE_CURRENCY_CODE)
  })

  it("lists no recent order and no best seller", async () => {
    const result = await snapshot()

    expect(result.recentOrders).toStrictEqual([])
    expect(result.topProducts).toStrictEqual([])
  })

  it("still draws every chart frame, flat at zero", async () => {
    const result = await snapshot()
    const dailyTotals = result.chartPoints30d.map((point) => point.orders + point.revenue)

    expect(result.chartPoints30d).toHaveLength(ADMIN_DASHBOARD_CHART_DAYS_30)
    expect(result.chartPoints7d).toHaveLength(ADMIN_DASHBOARD_CHART_DAYS_7)
    expect(result.chartPoints1y).toHaveLength(ADMIN_DASHBOARD_CHART_MONTHS_1Y)
    expect(dailyTotals).toStrictEqual(Array.from({ length: ADMIN_DASHBOARD_CHART_DAYS_30 }, () => 0))
  })

  it("names every weekday of the trailing week with no orders on it", async () => {
    const result = await snapshot()
    const weeklyOrders = result.weeklyOrders.map((point) => point.orders)

    expect(result.weeklyOrders).toHaveLength(ADMIN_DASHBOARD_CHART_DAYS_7)
    expect(weeklyOrders).toStrictEqual(Array.from({ length: ADMIN_DASHBOARD_CHART_DAYS_7 }, () => 0))
  })
})
