import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"

import { DashboardCharts } from "~/src/presentation/components/custom/pages/admin/dashboard-charts"
import {
  type DashboardChartRange,
  type DashboardCustomChartRange,
} from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range"

interface RangeState {
  readonly chartData: readonly AdminDashboard["chartPoint"][]
  readonly chartRange: DashboardChartRange
  readonly customRange: DashboardCustomChartRange | undefined
  readonly isCustomLoading: boolean
}

const rangeRef = vi.hoisted(() => {
  const initial: RangeState = { chartData: [], chartRange: "30d", customRange: undefined, isCustomLoading: false }

  return {
    current: initial,
    handlers: {
      applyCustomRange: vi.fn<() => void>(),
      clearCustomRange: vi.fn<() => void>(),
      selectPresetRange: vi.fn<() => void>(),
    },
  }
})

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot", () => ({
  useAdminDashboardSnapshot: () => ({ data: snapshotRef.current }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-dashboard-chart-range", () => ({
  useDashboardChartRange: () => ({ ...rangeRef.handlers, ...rangeRef.current }),
}))

const FLAT_STAT = { current: 0, previous: 0, trendPercent: 0 }

const point = (dateKey: string, revenue: number): AdminDashboard["chartPoint"] => ({ dateKey, label: dateKey, orders: 1, revenue })

const baseSnapshot = (): AdminDashboard["snapshot"] => ({
  averageOrderValue: FLAT_STAT,
  chartPoints1y: [],
  chartPoints30d: [],
  chartPoints7d: [],
  currencyCode: "PLN",
  customers: FLAT_STAT,
  orders: FLAT_STAT,
  pageViews: FLAT_STAT,
  recentOrders: [],
  revenue: FLAT_STAT,
  topProducts: [],
  weeklyOrders: [],
  yearToDateRevenueMinorUnits: 0,
})

const snapshotRef: { current: AdminDashboard["snapshot"] } = { current: baseSnapshot() }

const setRange = (state: Partial<RangeState>): void => {
  rangeRef.current = { ...rangeRef.current, ...state }
}

const chartWrapper = (): Element => {
  const wrapper = document.querySelector("[data-slot='chart']")
  if (wrapper === null) {
    throw new Error("the revenue chart never rendered")
  }

  return wrapper
}

afterEach(() => {
  cleanup()
  snapshotRef.current = baseSnapshot()
  rangeRef.current = { chartData: [], chartRange: "30d", customRange: undefined, isCustomLoading: false }
})

describe("DashboardCharts revenue card", () => {
  it("titles the card and offers every range preset", () => {
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Revenue Overview")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Last 7 days" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Last 30 days" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Last year" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument()
  })

  it("describes the thirty day preset with the day count it actually queries", () => {
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Revenue for the last 30 days")).toBeInTheDocument()
  })

  it("describes the seven day preset", () => {
    setRange({ chartRange: "7d" })
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Revenue for the last 7 days")).toBeInTheDocument()
  })

  it("describes the one year preset without a day count", () => {
    setRange({ chartRange: "1y" })
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Revenue for the last year")).toBeInTheDocument()
  })

  it("asks for dates while a custom range is still empty", () => {
    setRange({ chartRange: "custom" })
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Select a date range")).toBeInTheDocument()
  })

  it("spells out the chosen custom range as medium dates", () => {
    setRange({ chartRange: "custom", customRange: { endDate: "2026-09-07", startDate: "2026-09-01" } })
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText(/^Revenue from Sep \d{1,2}, 2026 to Sep \d{1,2}, 2026$/u)).toBeInTheDocument()
  })

  it("plots one x-axis tick per chart point", () => {
    setRange({ chartData: [point("2026-09-01", 120_000), point("2026-09-02", 240_000)] })
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("2026-09-01")).toBeInTheDocument()
    expect(screen.getByText("2026-09-02")).toBeInTheDocument()
  })

  it("labels the revenue axis in compact major units of the store currency", () => {
    setRange({ chartData: [point("2026-09-01", 0), point("2026-09-02", 400_000)] })
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("4K")).toBeInTheDocument()
  })

  it("dims the chart while a custom range is being fetched", () => {
    setRange({ chartRange: "custom", isCustomLoading: true })
    renderWithProviders(<DashboardCharts />)

    expect(chartWrapper().className).toContain("opacity-60")
  })

  it("shows the chart at full strength once nothing is in flight", () => {
    renderWithProviders(<DashboardCharts />)

    expect(chartWrapper().className).toContain("opacity-100")
  })
})

describe("DashboardCharts side cards", () => {
  it("formats the average order value as money in the store currency", () => {
    snapshotRef.current = {
      ...baseSnapshot(),
      averageOrderValue: { current: 24_900, previous: 20_000, trendPercent: 25 },
    }
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Average Order Value")).toBeInTheDocument()
    expect(screen.getByText("PLN 249.00")).toBeInTheDocument()
    expect(screen.getByText("+25%")).toBeInTheDocument()
  })

  it("formats the year to date total and links to the orders page", () => {
    snapshotRef.current = { ...baseSnapshot(), yearToDateRevenueMinorUnits: 1_234_500 }
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Year-to-date sales")).toBeInTheDocument()
    expect(screen.getByText("PLN 12,345.00")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View all orders" })).toHaveAttribute("href", "/admin/orders")
  })
})

describe("WeeklyOrdersChart", () => {
  it("titles the weekly orders card", () => {
    renderWithProviders(<DashboardCharts />)

    expect(screen.getByText("Orders this week")).toBeInTheDocument()
  })

  it("plots one bar label per day the snapshot reports", () => {
    snapshotRef.current = {
      ...baseSnapshot(),
      weeklyOrders: [
        { dateKey: "2026-09-21", dayLabel: "Mon", orders: 3 },
        { dateKey: "2026-09-22", dayLabel: "Tue", orders: 5 },
      ],
    }
    renderWithProviders(<DashboardCharts />)

    const dayLabels = screen.getAllByText(/^(?:Mon|Tue)$/u).map((node) => node.textContent)

    expect(new Set(dayLabels)).toStrictEqual(new Set(["Mon", "Tue"]))
    expect(document.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2)
  })
})
