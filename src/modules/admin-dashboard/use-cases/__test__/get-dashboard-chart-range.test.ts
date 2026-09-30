import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ADMIN_DASHBOARD_QUERY_KEYS, ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { getDashboardChartRange, getDashboardChartRangeQuery } from "~/src/modules/admin-dashboard/use-cases/get-dashboard-chart-range"

interface DailyAggregateRow {
  readonly dateKey: string
  readonly orders: number
  readonly revenue: number
}

const captured = vi.hoisted((): { validate?: (input: unknown) => unknown } => ({}))

const accessors = vi.hoisted(() => ({
  dailyOrderAggregatesQuery: vi.fn<(start: Date, end: Date) => Promise<DailyAggregateRow[]>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/admin-dashboard/admin-dashboard.accessors", () => accessors)
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) => handler(options),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        captured.validate = validate

        return builder
      },
    }

    return builder
  },
}))

const range = (startDate: string, endDate: string) => ({ data: { endDate, locale: "en-US", startDate } })

describe("getDashboardChartRange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessors.dailyOrderAggregatesQuery.mockResolvedValue([])
  })

  it("returns a point per day in the range, both bounds included", async () => {
    const points = await getDashboardChartRange(range("2026-03-01", "2026-03-03"))

    expect(points.map((point) => point.dateKey)).toStrictEqual(["2026-03-01", "2026-03-02", "2026-03-03"])
  })

  it("returns a single point when the range covers one day", async () => {
    const points = await getDashboardChartRange(range("2026-03-01", "2026-03-01"))

    expect(points).toHaveLength(1)
  })

  it("fills the days the aggregate query did not report with zeroes", async () => {
    accessors.dailyOrderAggregatesQuery.mockResolvedValue([{ dateKey: "2026-03-02", orders: 3, revenue: 45_000 }])

    const points = await getDashboardChartRange(range("2026-03-01", "2026-03-03"))

    expect(points.map((point) => [point.dateKey, point.orders, point.revenue])).toStrictEqual([
      ["2026-03-01", 0, 0],
      ["2026-03-02", 3, 45_000],
      ["2026-03-03", 0, 0],
    ])
  })

  it("labels each day in the requested locale", async () => {
    const points = await getDashboardChartRange(range("2026-03-01", "2026-03-01"))

    expect(points[0]?.label).toBe(new Date(2026, 2, 1).toLocaleDateString("en-US", { day: "numeric", month: "short" }))
  })

  it("queries the aggregates from the start of the first day to the end of the last", async () => {
    await getDashboardChartRange(range("2026-03-01", "2026-03-03"))

    const [start, end] = accessors.dailyOrderAggregatesQuery.mock.calls[0] ?? []
    expect(start?.getHours()).toBe(0)
    expect(end?.getHours()).toBe(23)
    expect(end?.getDate()).toBe(3)
  })

  it("returns nothing and touches no data when the range runs backwards", async () => {
    await expect(getDashboardChartRange(range("2026-03-05", "2026-03-01"))).resolves.toStrictEqual([])

    expect(accessors.dailyOrderAggregatesQuery).not.toHaveBeenCalled()
  })

  it("returns nothing for a date that is not an iso day", async () => {
    await expect(getDashboardChartRange(range("01/03/2026", "2026-03-03"))).resolves.toStrictEqual([])

    expect(accessors.dailyOrderAggregatesQuery).not.toHaveBeenCalled()
  })
})

describe("getDashboardChartRange input validation", () => {
  it("accepts a locale with both range bounds", () => {
    expect(captured.validate?.({ endDate: "2026-03-03", locale: "en-US", startDate: "2026-03-01" })).toStrictEqual({
      endDate: "2026-03-03",
      locale: "en-US",
      startDate: "2026-03-01",
    })
  })

  it.each([
    ["a missing locale", { endDate: "2026-03-03", startDate: "2026-03-01" }],
    ["a missing end date", { locale: "en-US", startDate: "2026-03-01" }],
    ["a non string start date", { endDate: "2026-03-03", locale: "en-US", startDate: 20_260_301 }],
  ])("rejects %s", (_label, input) => {
    expect(() => captured.validate?.(input)).toThrow()
  })
})

describe("getDashboardChartRangeQuery", () => {
  it("keys the query by locale and both bounds", () => {
    const options = getDashboardChartRangeQuery({ endDate: "2026-03-03", locale: "en-US", startDate: "2026-03-01" })

    expect(options.queryKey).toStrictEqual([...ADMIN_DASHBOARD_QUERY_KEYS.CHART_RANGE, "en-US", "2026-03-01", "2026-03-03"])
    expect(options.staleTime).toBe(ADMIN_DASHBOARD_QUERY_STALE_MS)
  })

  it("is enabled for a valid range", () => {
    expect(getDashboardChartRangeQuery({ endDate: "2026-03-03", locale: "en-US", startDate: "2026-03-01" }).enabled).toBe(true)
  })

  it("stays disabled while the range is impossible", () => {
    expect(getDashboardChartRangeQuery({ endDate: "2026-03-01", locale: "en-US", startDate: "2026-03-05" }).enabled).toBe(false)
    expect(getDashboardChartRangeQuery({ endDate: "", locale: "en-US", startDate: "" }).enabled).toBe(false)
  })

  it("reads the chart points through the server function when fetched", async () => {
    accessors.dailyOrderAggregatesQuery.mockResolvedValue([{ dateKey: "2026-03-01", orders: 2, revenue: 10_000 }])

    const points = await new QueryClient().query(
      getDashboardChartRangeQuery({ endDate: "2026-03-01", locale: "en-US", startDate: "2026-03-01" }),
    )

    expect(points.map((point) => [point.dateKey, point.orders, point.revenue])).toStrictEqual([["2026-03-01", 2, 10_000]])
  })

  it("never refetches on mount or focus so the admin keeps the range they picked", () => {
    const options = getDashboardChartRangeQuery({ endDate: "2026-03-03", locale: "en-US", startDate: "2026-03-01" })

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})
