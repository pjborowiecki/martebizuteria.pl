import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"

import { useDashboardChartRange } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"

const point = (dateKey: string, revenue: number): AdminDashboard["chartPoint"] => ({ dateKey, label: dateKey, orders: 1, revenue })

const snapshot = {
  chartPoints1y: [point("2026-01", 5000)],
  chartPoints30d: [point("2026-09-01", 300), point("2026-09-02", 400)],
  chartPoints7d: [point("2026-09-20", 100)],
}

const custom = vi.hoisted(() => ({
  fetch: vi.fn((input: { endDate: string; startDate: string }) =>
    Promise.resolve([{ dateKey: input.startDate, label: input.startDate, orders: 2, revenue: 999 }]),
  ),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot", () => ({
  useAdminDashboardSnapshot: () => ({ data: snapshot }),
}))
vi.mock("~/src/modules/admin-dashboard/use-cases/get-dashboard-chart-range", () => ({
  getDashboardChartRangeQuery: (input: { endDate: string; locale: string; startDate: string }) =>
    queryOptions({
      queryFn: () => custom.fetch(input),
      queryKey: ["chart-range", input.locale, input.startDate, input.endDate] as const,
    }),
}))

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone={I18N.DEFAULT_TIMEZONE}>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
  </IntlProvider>
)

describe("useDashboardChartRange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("starts on the thirty day preset taken straight from the snapshot", () => {
    const { result } = renderHook(() => useDashboardChartRange(), { wrapper })

    expect(result.current.chartRange).toBe("30d")
    expect(result.current.chartData).toStrictEqual(snapshot.chartPoints30d)
    expect(result.current.customRange).toBeUndefined()
    expect(result.current.isCustomLoading).toBe(false)
  })

  it("switches between the preset windows the snapshot carries", () => {
    const { result } = renderHook(() => useDashboardChartRange(), { wrapper })

    act(() => {
      result.current.selectPresetRange("7d")
    })

    expect(result.current.chartData).toStrictEqual(snapshot.chartPoints7d)

    act(() => {
      result.current.selectPresetRange("1y")
    })

    expect(result.current.chartData).toStrictEqual(snapshot.chartPoints1y)
  })

  it("never asks the server for a preset window", () => {
    const { result } = renderHook(() => useDashboardChartRange(), { wrapper })

    act(() => {
      result.current.selectPresetRange("7d")
    })

    expect(custom.fetch).not.toHaveBeenCalled()
  })

  it("fetches a valid custom range and reports it while it loads", async () => {
    const { result } = renderHook(() => useDashboardChartRange(), { wrapper })

    act(() => {
      result.current.applyCustomRange({ endDate: "2026-09-30", startDate: "2026-09-01" })
    })

    expect(result.current.chartRange).toBe("custom")
    expect(result.current.customRange).toStrictEqual({ endDate: "2026-09-30", startDate: "2026-09-01" })
    expect(result.current.isCustomLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isCustomLoading).toBe(false)
    })
    expect(result.current.chartData).toStrictEqual([{ dateKey: "2026-09-01", label: "2026-09-01", orders: 2, revenue: 999 }])
    expect(custom.fetch).toHaveBeenCalledTimes(1)
  })

  it("refuses to fetch a custom range whose start is after its end", () => {
    const { result } = renderHook(() => useDashboardChartRange(), { wrapper })

    act(() => {
      result.current.applyCustomRange({ endDate: "2026-09-01", startDate: "2026-09-30" })
    })

    expect(result.current.chartRange).toBe("custom")
    expect(result.current.chartData).toStrictEqual([])
    expect(custom.fetch).not.toHaveBeenCalled()
  })

  it("refuses to fetch a custom range that is not a pair of iso dates", () => {
    const { result } = renderHook(() => useDashboardChartRange(), { wrapper })

    act(() => {
      result.current.applyCustomRange({ endDate: "not-a-date", startDate: "2026-09-01" })
    })

    expect(result.current.chartData).toStrictEqual([])
    expect(custom.fetch).not.toHaveBeenCalled()
  })

  it("returns to the default preset when the custom range is cleared", async () => {
    const { result } = renderHook(() => useDashboardChartRange(), { wrapper })

    act(() => {
      result.current.applyCustomRange({ endDate: "2026-09-30", startDate: "2026-09-01" })
    })
    await waitFor(() => {
      expect(result.current.isCustomLoading).toBe(false)
    })

    act(() => {
      result.current.clearCustomRange()
    })

    expect(result.current.chartRange).toBe("30d")
    expect(result.current.customRange).toBeUndefined()
    expect(result.current.chartData).toStrictEqual(snapshot.chartPoints30d)
  })
})
