import { describe, expect, it } from "vite-plus/test"

import {
  ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS,
  ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
  ADMIN_DASHBOARD_MONTH_LABEL_FORMAT,
  ADMIN_DASHBOARD_MS_PER_DAY,
} from "~/src/modules/order/order.constants"
import {
  type AdminDashboardChartWindow,
  buildAdminDashboardChartPoints,
  buildAdminDashboardKpiStat,
  buildAdminDashboardWeeklyOrderPoints,
  computeAdminDashboardTrendPercent,
  isAdminDashboardCustomChartRangeValid,
  resolveAdminDashboardComparisonPeriod,
  resolveAdminDashboardDateRange,
  resolveAdminDashboardDays,
  resolveAdminDashboardMonths,
  resolveAdminDashboardYearStart,
} from "~/src/modules/order/order.dashboard.utils"

const POLAND = "Europe/Warsaw"

const REFERENCE = new Date("2026-06-15T12:30:00.000Z")

const describeWindow = (window: AdminDashboardChartWindow) => ({
  end: window.end.toISOString(),
  periods: window.periods.map((period) => [period.key, period.start.toISOString()]),
  start: window.start.toISOString(),
})

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

describe("resolveAdminDashboardDays", () => {
  it("ends on today in Poland while UTC is still on the day before", () => {
    const window = resolveAdminDashboardDays(new Date("2026-06-14T22:30:00.000Z"), 2, POLAND)

    expect(describeWindow(window)).toStrictEqual({
      end: "2026-06-15T22:00:00.000Z",
      periods: [
        ["2026-06-14", "2026-06-13T22:00:00.000Z"],
        ["2026-06-15", "2026-06-14T22:00:00.000Z"],
      ],
      start: "2026-06-13T22:00:00.000Z",
    })
  })

  it("moves each day's start an hour earlier from the day clocks go forward", () => {
    const window = resolveAdminDashboardDays(new Date("2026-03-30T10:00:00.000Z"), 3, POLAND)

    expect(describeWindow(window)).toStrictEqual({
      end: "2026-03-30T22:00:00.000Z",
      periods: [
        ["2026-03-28", "2026-03-27T23:00:00.000Z"],
        ["2026-03-29", "2026-03-28T23:00:00.000Z"],
        ["2026-03-30", "2026-03-29T22:00:00.000Z"],
      ],
      start: "2026-03-27T23:00:00.000Z",
    })
  })

  it("moves each day's start an hour later from the day clocks go back", () => {
    const window = resolveAdminDashboardDays(new Date("2026-10-26T10:00:00.000Z"), 3, POLAND)

    expect(describeWindow(window)).toStrictEqual({
      end: "2026-10-26T23:00:00.000Z",
      periods: [
        ["2026-10-24", "2026-10-23T22:00:00.000Z"],
        ["2026-10-25", "2026-10-24T22:00:00.000Z"],
        ["2026-10-26", "2026-10-25T23:00:00.000Z"],
      ],
      start: "2026-10-23T22:00:00.000Z",
    })
  })

  it("counts New Year's Day from midnight in Poland", () => {
    const window = resolveAdminDashboardDays(new Date("2026-12-31T23:30:00.000Z"), 2, POLAND)

    expect(window.periods.map((period) => [period.key, period.start.toISOString()])).toStrictEqual([
      ["2026-12-31", "2026-12-30T23:00:00.000Z"],
      ["2027-01-01", "2026-12-31T23:00:00.000Z"],
    ])
  })
})

describe("resolveAdminDashboardMonths", () => {
  it("ends on the month it is in Poland while UTC is still in the month before", () => {
    const window = resolveAdminDashboardMonths(new Date("2026-09-30T22:30:00.000Z"), 1, POLAND)

    expect(describeWindow(window)).toStrictEqual({
      end: "2026-10-31T23:00:00.000Z",
      periods: [["2026-10", "2026-09-30T22:00:00.000Z"]],
      start: "2026-09-30T22:00:00.000Z",
    })
  })

  it("starts each month at midnight in Poland on its first day, across a new year", () => {
    const window = resolveAdminDashboardMonths(new Date("2027-01-10T12:00:00.000Z"), 3, POLAND)

    expect(describeWindow(window)).toStrictEqual({
      end: "2027-01-31T23:00:00.000Z",
      periods: [
        ["2026-11", "2026-10-31T23:00:00.000Z"],
        ["2026-12", "2026-11-30T23:00:00.000Z"],
        ["2027-01", "2026-12-31T23:00:00.000Z"],
      ],
      start: "2026-10-31T23:00:00.000Z",
    })
  })

  it("covers a full year ending on the reference month", () => {
    const window = resolveAdminDashboardMonths(REFERENCE, 12, POLAND)

    expect(window.periods).toHaveLength(12)
    expect(window.periods[0]?.key).toBe("2025-07")
    expect(window.periods.at(-1)?.key).toBe("2026-06")
  })
})

describe("resolveAdminDashboardDateRange", () => {
  it("covers every day from the start to the end inclusively, until midnight in Poland after the last", () => {
    const window = resolveAdminDashboardDateRange("2026-10-24", "2026-10-26", POLAND)

    expect(describeWindow(window)).toStrictEqual({
      end: "2026-10-26T23:00:00.000Z",
      periods: [
        ["2026-10-24", "2026-10-23T22:00:00.000Z"],
        ["2026-10-25", "2026-10-24T22:00:00.000Z"],
        ["2026-10-26", "2026-10-25T23:00:00.000Z"],
      ],
      start: "2026-10-23T22:00:00.000Z",
    })
  })

  it("covers a single Polish day when both ends are the same date", () => {
    const window = resolveAdminDashboardDateRange("2026-03-29", "2026-03-29", POLAND)

    expect(describeWindow(window)).toStrictEqual({
      end: "2026-03-29T22:00:00.000Z",
      periods: [["2026-03-29", "2026-03-28T23:00:00.000Z"]],
      start: "2026-03-28T23:00:00.000Z",
    })
  })

  it("keeps one day per date across New Year", () => {
    const window = resolveAdminDashboardDateRange("2026-12-30", "2027-01-02", POLAND)

    expect(window.periods.map((period) => period.key)).toStrictEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"])
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

describe("buildAdminDashboardChartPoints", () => {
  const days = resolveAdminDashboardDays(new Date("2026-06-15T10:00:00.000Z"), 3, POLAND)

  it("emits one point per period in chronological order", () => {
    const points = buildAdminDashboardChartPoints({
      formatLocale: "en-US",
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      periods: days.periods,
      rows: [],
      timeZone: POLAND,
    })

    expect(points.map((point) => point.dateKey)).toStrictEqual(["2026-06-13", "2026-06-14", "2026-06-15"])
  })

  it("fills the periods with no activity with zeroes and attaches the aggregate of the others", () => {
    const points = buildAdminDashboardChartPoints({
      formatLocale: "en-US",
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      periods: days.periods,
      rows: [{ orders: 2, periodKey: "2026-06-14", revenue: 12_000 }],
      timeZone: POLAND,
    })

    expect(points.map((point) => [point.orders, point.revenue])).toStrictEqual([
      [0, 0],
      [2, 12_000],
      [0, 0],
    ])
  })

  it("ignores aggregate rows for periods outside the window", () => {
    const points = buildAdminDashboardChartPoints({
      formatLocale: "en-US",
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      periods: days.periods,
      rows: [{ orders: 9, periodKey: "2020-01-01", revenue: 9 }],
      timeZone: POLAND,
    })

    expect(points.every((point) => point.orders === 0)).toBe(true)
  })

  it("names each day as it is in Poland, in the requested locale", () => {
    const english = buildAdminDashboardChartPoints({
      formatLocale: "en-US",
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      periods: days.periods,
      rows: [],
      timeZone: POLAND,
    })
    const polish = buildAdminDashboardChartPoints({
      formatLocale: "pl-PL",
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      periods: days.periods,
      rows: [],
      timeZone: POLAND,
    })

    expect(english.map((point) => point.label)).toStrictEqual(["Jun 13", "Jun 14", "Jun 15"])
    expect(polish.at(-1)?.label).toBe("15 cze")
  })

  it("names each month with its year", () => {
    const months = resolveAdminDashboardMonths(new Date("2027-01-10T12:00:00.000Z"), 2, POLAND)
    const points = buildAdminDashboardChartPoints({
      formatLocale: "en-US",
      labelFormat: ADMIN_DASHBOARD_MONTH_LABEL_FORMAT,
      periods: months.periods,
      rows: [],
      timeZone: POLAND,
    })

    expect(points.map((point) => [point.dateKey, point.label])).toStrictEqual([
      ["2026-12", "Dec 2026"],
      ["2027-01", "Jan 2027"],
    ])
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
