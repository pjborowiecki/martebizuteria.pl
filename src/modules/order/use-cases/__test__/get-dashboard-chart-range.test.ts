import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ADMIN_DASHBOARD_QUERY_KEYS, ADMIN_DASHBOARD_QUERY_STALE_MS } from "~/src/modules/order/order.constants"
import { type AdminDashboardChartWindow } from "~/src/modules/order/order.dashboard.utils"
import { getDashboardChartRange, getDashboardChartRangeQuery } from "~/src/modules/order/use-cases/get-dashboard-chart-range"

interface OrderAggregateRow {
  readonly orders: number
  readonly periodKey: string
  readonly revenue: number
}

const captured = vi.hoisted((): { validate?: (input: unknown) => unknown } => ({}))

const accessors = vi.hoisted(() => ({
  orderAggregatesQuery: vi.fn<(window: AdminDashboardChartWindow) => Promise<OrderAggregateRow[]>>(),
}))

const viewer = vi.hoisted(() => ({ preferences: { formatLocale: "en-US", timeZone: "Europe/Warsaw" } }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/order/order.dashboard.accessors", () => accessors)
vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => ({
  resolveRequestDisplayPreferences: () => Promise.resolve(viewer.preferences),
}))
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

const range = (startDate: string, endDate: string) => ({ data: { endDate, startDate } })

describe("getDashboardChartRange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessors.orderAggregatesQuery.mockResolvedValue([])
    viewer.preferences = { formatLocale: "en-US", timeZone: "Europe/Warsaw" }
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
    accessors.orderAggregatesQuery.mockResolvedValue([{ orders: 3, periodKey: "2026-03-02", revenue: 45_000 }])

    const points = await getDashboardChartRange(range("2026-03-01", "2026-03-03"))

    expect(points.map((point) => [point.dateKey, point.orders, point.revenue])).toStrictEqual([
      ["2026-03-01", 0, 0],
      ["2026-03-02", 3, 45_000],
      ["2026-03-03", 0, 0],
    ])
  })

  it("labels each day in the viewer's format locale", async () => {
    const [english] = await getDashboardChartRange(range("2026-03-01", "2026-03-01"))
    viewer.preferences = { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" }
    const [polish] = await getDashboardChartRange(range("2026-03-01", "2026-03-01"))

    expect(english?.label).toBe("Mar 1")
    expect(polish?.label).toBe("1 mar")
  })

  it("starts and ends each day at midnight in the viewer's time zone", async () => {
    viewer.preferences = { formatLocale: "en-US", timeZone: "America/New_York" }

    await getDashboardChartRange(range("2026-03-01", "2026-03-01"))

    const [window] = accessors.orderAggregatesQuery.mock.calls[0] ?? []
    expect(window?.start.toISOString()).toBe("2026-03-01T05:00:00.000Z")
    expect(window?.end.toISOString()).toBe("2026-03-02T05:00:00.000Z")
  })

  it("queries the aggregates from midnight in Poland on the first day until midnight in Poland after the last", async () => {
    await getDashboardChartRange(range("2026-03-28", "2026-03-29"))

    const [window] = accessors.orderAggregatesQuery.mock.calls[0] ?? []
    expect(window?.start.toISOString()).toBe("2026-03-27T23:00:00.000Z")
    expect(window?.end.toISOString()).toBe("2026-03-29T22:00:00.000Z")
    expect(window?.periods.map((period) => period.key)).toStrictEqual(["2026-03-28", "2026-03-29"])
  })

  it("returns nothing and touches no data when the range runs backwards", async () => {
    await expect(getDashboardChartRange(range("2026-03-05", "2026-03-01"))).resolves.toStrictEqual([])

    expect(accessors.orderAggregatesQuery).not.toHaveBeenCalled()
  })

  it("returns nothing for a date that is not an iso day", async () => {
    await expect(getDashboardChartRange(range("01/03/2026", "2026-03-03"))).resolves.toStrictEqual([])

    expect(accessors.orderAggregatesQuery).not.toHaveBeenCalled()
  })
})

describe("getDashboardChartRange input validation", () => {
  it("accepts both range bounds", () => {
    expect(captured.validate?.({ endDate: "2026-03-03", startDate: "2026-03-01" })).toStrictEqual({
      endDate: "2026-03-03",
      startDate: "2026-03-01",
    })
  })

  it.each([
    ["a missing end date", { startDate: "2026-03-01" }],
    ["a non string start date", { endDate: "2026-03-03", startDate: 20_260_301 }],
  ])("rejects %s", (_label, input) => {
    expect(() => captured.validate?.(input)).toThrow()
  })
})

describe("getDashboardChartRangeQuery", () => {
  it("keys the query by both bounds", () => {
    const options = getDashboardChartRangeQuery({ endDate: "2026-03-03", startDate: "2026-03-01" })

    expect(options.queryKey).toStrictEqual([...ADMIN_DASHBOARD_QUERY_KEYS.CHART_RANGE, "2026-03-01", "2026-03-03"])
    expect(options.staleTime).toBe(ADMIN_DASHBOARD_QUERY_STALE_MS)
  })

  it("is enabled for a valid range", () => {
    expect(getDashboardChartRangeQuery({ endDate: "2026-03-03", startDate: "2026-03-01" }).enabled).toBe(true)
  })

  it("stays disabled while the range is impossible", () => {
    expect(getDashboardChartRangeQuery({ endDate: "2026-03-01", startDate: "2026-03-05" }).enabled).toBe(false)
    expect(getDashboardChartRangeQuery({ endDate: "", startDate: "" }).enabled).toBe(false)
  })

  it("reads the chart points through the server function when fetched", async () => {
    accessors.orderAggregatesQuery.mockResolvedValue([{ orders: 2, periodKey: "2026-03-01", revenue: 10_000 }])

    const points = await new QueryClient().query(getDashboardChartRangeQuery({ endDate: "2026-03-01", startDate: "2026-03-01" }))

    expect(points.map((point) => [point.dateKey, point.orders, point.revenue])).toStrictEqual([["2026-03-01", 2, 10_000]])
  })

  it("never refetches on mount or focus so the admin keeps the range they picked", () => {
    const options = getDashboardChartRangeQuery({ endDate: "2026-03-03", startDate: "2026-03-01" })

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})
