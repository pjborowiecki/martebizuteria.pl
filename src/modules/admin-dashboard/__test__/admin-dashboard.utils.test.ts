import { describe, expect, it } from "vite-plus/test"

import {
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS,
  ADMIN_DASHBOARD_MS_PER_DAY,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import {
  buildAdminDashboardDailyChartPoints,
  buildAdminDashboardDailyChartPointsForIsoDateRange,
  buildAdminDashboardKpiStat,
  buildAdminDashboardMonthlyChartPoints,
  buildAdminDashboardWeeklyOrderPoints,
  computeAdminDashboardTrendPercent,
  isAdminDashboardCustomChartRangeValid,
  resolveAdminDashboardChartStart,
  resolveAdminDashboardComparisonPeriod,
  resolveAdminDashboardMonthlyChartStart,
  resolveAdminDashboardYearStart,
} from "~/src/modules/admin-dashboard/admin-dashboard.utils"

const REFERENCE = new Date(2024, 5, 15, 14, 30)

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

describe("chart window starts", () => {
  it("counts the reference day itself as the last day of a daily window", () => {
    expect(resolveAdminDashboardChartStart(REFERENCE, 7).getTime()).toBe(REFERENCE.getTime() - 6 * ADMIN_DASHBOARD_MS_PER_DAY)
  })

  it("starts a single day window at the reference instant", () => {
    expect(resolveAdminDashboardChartStart(REFERENCE, 1)).toStrictEqual(REFERENCE)
  })

  it("starts a monthly window on the first of the earliest month", () => {
    const start = resolveAdminDashboardMonthlyChartStart(REFERENCE, 12)

    expect(start).toStrictEqual(new Date(2023, 6, 1))
  })

  it("defaults the monthly window to a year", () => {
    expect(resolveAdminDashboardMonthlyChartStart(REFERENCE).getMonth()).toBe(
      new Date(2024, 5 - (ADMIN_DASHBOARD_CHART_MONTHS_1Y - 1), 1).getMonth(),
    )
  })

  it("starts the year window on the first of January", () => {
    expect(resolveAdminDashboardYearStart(REFERENCE)).toStrictEqual(new Date(2024, 0, 1))
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

describe("buildAdminDashboardDailyChartPoints", () => {
  it("emits one point per day in chronological order, ending on the reference day", () => {
    const points = buildAdminDashboardDailyChartPoints({ days: 3, referenceDate: REFERENCE, rows: [] })

    expect(points.map((point) => point.dateKey)).toStrictEqual(["2024-06-13", "2024-06-14", "2024-06-15"])
  })

  it("fills the days with no activity with zeroes", () => {
    const points = buildAdminDashboardDailyChartPoints({
      days: 3,
      referenceDate: REFERENCE,
      rows: [{ dateKey: "2024-06-14", orders: 2, revenue: 12_000 }],
    })

    expect(points.map((point) => point.orders)).toStrictEqual([0, 2, 0])
    expect(points.map((point) => point.revenue)).toStrictEqual([0, 12_000, 0])
  })

  it("ignores aggregate rows outside the window", () => {
    const points = buildAdminDashboardDailyChartPoints({
      days: 2,
      referenceDate: REFERENCE,
      rows: [{ dateKey: "2020-01-01", orders: 9, revenue: 9 }],
    })

    expect(points.every((point) => point.orders === 0)).toBe(true)
  })

  it("labels each point in the requested locale", () => {
    const [point] = buildAdminDashboardDailyChartPoints({ days: 1, locale: "en-US", referenceDate: REFERENCE, rows: [] })

    expect(point?.label).toBe("Jun 15")
  })
})

describe("buildAdminDashboardMonthlyChartPoints", () => {
  it("emits one point per month in chronological order, ending on the reference month", () => {
    const points = buildAdminDashboardMonthlyChartPoints({ months: 3, referenceDate: REFERENCE, rows: [] })

    expect(points.map((point) => point.dateKey)).toStrictEqual(["2024-04", "2024-05", "2024-06"])
  })

  it("zero-pads the month key so it matches the aggregate rows", () => {
    const points = buildAdminDashboardMonthlyChartPoints({
      months: 2,
      referenceDate: new Date(2024, 1, 10),
      rows: [{ monthKey: "2024-01", orders: 3, revenue: 300 }],
    })

    expect(points[0]).toMatchObject({ dateKey: "2024-01", orders: 3, revenue: 300 })
  })

  it("crosses the year boundary correctly", () => {
    const points = buildAdminDashboardMonthlyChartPoints({ months: 3, referenceDate: new Date(2024, 0, 10), rows: [] })

    expect(points.map((point) => point.dateKey)).toStrictEqual(["2023-11", "2023-12", "2024-01"])
  })

  it("defaults to a full year of points", () => {
    expect(buildAdminDashboardMonthlyChartPoints({ referenceDate: REFERENCE, rows: [] })).toHaveLength(ADMIN_DASHBOARD_CHART_MONTHS_1Y)
  })

  it("labels each point with the month and year", () => {
    const [point] = buildAdminDashboardMonthlyChartPoints({ locale: "en-US", months: 1, referenceDate: REFERENCE, rows: [] })

    expect(point?.label).toBe("Jun 2024")
  })
})

describe("isAdminDashboardCustomChartRangeValid", () => {
  it("accepts an ordered range and a single day", () => {
    expect(isAdminDashboardCustomChartRangeValid("2024-06-01", "2024-06-15")).toBe(true)
    expect(isAdminDashboardCustomChartRangeValid("2024-06-15", "2024-06-15")).toBe(true)
  })

  it("rejects an inverted range", () => {
    expect(isAdminDashboardCustomChartRangeValid("2024-06-15", "2024-06-01")).toBe(false)
  })

  it("rejects endpoints that are not real calendar dates", () => {
    expect(isAdminDashboardCustomChartRangeValid("2024-02-30", "2024-06-15")).toBe(false)
    expect(isAdminDashboardCustomChartRangeValid("2024-06-01", "")).toBe(false)
  })
})

describe("buildAdminDashboardDailyChartPointsForIsoDateRange", () => {
  it("covers every day from the start to the end inclusively", () => {
    const points = buildAdminDashboardDailyChartPointsForIsoDateRange({ endDate: "2024-06-03", rows: [], startDate: "2024-06-01" })

    expect(points.map((point) => point.dateKey)).toStrictEqual(["2024-06-01", "2024-06-02", "2024-06-03"])
  })

  it("emits a single point when the range is one day", () => {
    expect(buildAdminDashboardDailyChartPointsForIsoDateRange({ endDate: "2024-06-01", rows: [], startDate: "2024-06-01" })).toHaveLength(1)
  })

  it("emits nothing for an inverted range", () => {
    expect(buildAdminDashboardDailyChartPointsForIsoDateRange({ endDate: "2024-06-01", rows: [], startDate: "2024-06-03" })).toStrictEqual(
      [],
    )
  })

  it("attaches the matching aggregate to each day", () => {
    const points = buildAdminDashboardDailyChartPointsForIsoDateRange({
      endDate: "2024-06-02",
      rows: [{ dateKey: "2024-06-02", orders: 4, revenue: 40_000 }],
      startDate: "2024-06-01",
    })

    expect(points.map((point) => point.orders)).toStrictEqual([0, 4])
  })

  it("keeps one point per calendar day across a spring-forward boundary", () => {
    const points = buildAdminDashboardDailyChartPointsForIsoDateRange({ endDate: "2024-04-01", rows: [], startDate: "2024-03-29" })

    expect(new Set(points.map((point) => point.dateKey)).size).toBe(points.length)
  })
})

describe("buildAdminDashboardWeeklyOrderPoints", () => {
  it("emits one point per day of the trailing week", () => {
    const points = buildAdminDashboardWeeklyOrderPoints({ referenceDate: REFERENCE, rows: [] })

    expect(points).toHaveLength(ADMIN_DASHBOARD_CHART_DAYS_7)
    expect(points.at(-1)?.dateKey).toBe("2024-06-15")
  })

  it("labels each day by weekday name", () => {
    const points = buildAdminDashboardWeeklyOrderPoints({ locale: "en-US", referenceDate: REFERENCE, rows: [] })

    expect(points.at(-1)?.dayLabel).toBe("Sat")
  })

  it("carries the order counts through and drops the revenue", () => {
    const points = buildAdminDashboardWeeklyOrderPoints({
      referenceDate: REFERENCE,
      rows: [{ dateKey: "2024-06-15", orders: 5, revenue: 50_000 }],
    })

    expect(points.at(-1)).toStrictEqual({ dateKey: "2024-06-15", dayLabel: points.at(-1)?.dayLabel, orders: 5 })
  })
})
