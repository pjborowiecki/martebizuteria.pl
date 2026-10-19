import { describe, expect, it, vi } from "vite-plus/test"

import { ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS, ADMIN_DASHBOARD_MS_PER_DAY } from "~/src/modules/order/order.constants"
import { resolveAdminDashboardDays } from "~/src/modules/order/order.utils"
import {
  buildAdminDashboardKpiStat,
  buildAdminDashboardWeeklyOrderPoints,
  computeAdminDashboardTrendPercent,
  resolveAdminDashboardComparisonPeriod,
  resolveAdminDashboardYearStart,
} from "~/src/modules/order/use-cases/get-dashboard-snapshot"

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))
vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => ({ resolveRequestDisplayPreferences: vi.fn() }))
vi.mock("~/src/modules/user/user.accessors", () => ({ newCustomersQuery: vi.fn() }))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ pageViewsQuery: vi.fn() }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: () => vi.fn(),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const POLAND = "Europe/Warsaw"

const REFERENCE = new Date("2026-06-15T12:30:00.000Z")

describe("resolveAdminDashboardComparisonPeriod", () => {
  it("puts the previous window immediately before the current one", () => {
    const period = resolveAdminDashboardComparisonPeriod(REFERENCE, 30)

    expect(period.previousEnd).toStrictEqual(period.currentStart)
    expect(period.currentStart.getTime() - period.previousStart.getTime()).toBe(30 * ADMIN_DASHBOARD_MS_PER_DAY)
  })

  it("defaults to the configured comparison length", () => {
    const period = resolveAdminDashboardComparisonPeriod(REFERENCE)

    expect(REFERENCE.getTime() - period.currentStart.getTime()).toBe(ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS * ADMIN_DASHBOARD_MS_PER_DAY)
  })
})

describe("resolveAdminDashboardYearStart", () => {
  it("starts the year at midnight on 1 January in Poland", () => {
    expect(resolveAdminDashboardYearStart(REFERENCE, POLAND).toISOString()).toBe("2025-12-31T23:00:00.000Z")
  })

  it("starts the new year in the first hour of 1 January in Poland, while UTC is still in December", () => {
    expect(resolveAdminDashboardYearStart(new Date("2026-12-31T23:30:00.000Z"), POLAND).toISOString()).toBe("2026-12-31T23:00:00.000Z")
  })
})

describe("computeAdminDashboardTrendPercent", () => {
  it.each([
    [150, 100, 50],
    [50, 100, -50],
    [100, 100, 0],
    [133, 100, 33],
  ])("reports %i against %i as %i percent", (current, previous, expected) => {
    expect(computeAdminDashboardTrendPercent(current, previous)).toBe(expected)
  })

  it.each([
    [0, 0],
    [0, -5],
  ])("reports no movement when the previous period was %i and there is nothing now", (current, previous) => {
    expect(computeAdminDashboardTrendPercent(current, previous)).toBe(0)
  })

  it("treats growth from nothing as a full hundred percent rather than infinity", () => {
    expect(computeAdminDashboardTrendPercent(500, 0)).toBe(100)
  })

  it("bundles the current, previous and trend into one stat", () => {
    expect(buildAdminDashboardKpiStat(150, 100)).toStrictEqual({ current: 150, previous: 100, trendPercent: 50 })
  })
})

describe("buildAdminDashboardWeeklyOrderPoints", () => {
  const week = resolveAdminDashboardDays(new Date("2026-06-14T22:30:00.000Z"), 7, POLAND)

  it("emits one point per day of the week, ending on today in Poland", () => {
    const points = buildAdminDashboardWeeklyOrderPoints({ formatLocale: "en-US", periods: week.periods, rows: [], timeZone: POLAND })

    expect(points).toHaveLength(7)
    expect(points.at(-1)?.dateKey).toBe("2026-06-15")
  })

  it("names each day by its weekday in Poland", () => {
    const points = buildAdminDashboardWeeklyOrderPoints({ formatLocale: "en-US", periods: week.periods, rows: [], timeZone: POLAND })

    expect(points.at(-1)?.dayLabel).toBe("Mon")
  })

  it("carries the order counts through and drops the revenue", () => {
    const points = buildAdminDashboardWeeklyOrderPoints({
      formatLocale: "en-US",
      periods: week.periods,
      rows: [{ orders: 5, periodKey: "2026-06-15", revenue: 50_000 }],
      timeZone: POLAND,
    })

    expect(points.at(-1)).toStrictEqual({ dateKey: "2026-06-15", dayLabel: "Mon", orders: 5 })
  })
})
