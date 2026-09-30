import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"

interface Snapshot {
  currencyCode: AdminDashboard["snapshot"]["currencyCode"]
  customers: AdminDashboard["kpiStat"]
  orders: AdminDashboard["kpiStat"]
  pageViews: AdminDashboard["kpiStat"]
  revenue: AdminDashboard["kpiStat"]
}

const snapshot = vi.hoisted((): Snapshot => ({
  currencyCode: "PLN",
  customers: { current: 48, previous: 40, trendPercent: 20 },
  orders: { current: 1234, previous: 1000, trendPercent: 23.4 },
  pageViews: { current: 98_765, previous: 120_000, trendPercent: -17.7 },
  revenue: { current: 1_234_500, previous: 1_000_000, trendPercent: 23.5 },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot", () => ({
  useAdminDashboardSnapshot: () => ({ data: snapshot }),
}))

import { DashboardStats } from "~/src/presentation/components/custom/pages/admin/dashboard-stats"

beforeEach(() => {
  snapshot.currencyCode = "PLN"
  snapshot.customers = { current: 48, previous: 40, trendPercent: 20 }
  snapshot.orders = { current: 1234, previous: 1000, trendPercent: 23.4 }
  snapshot.pageViews = { current: 98_765, previous: 120_000, trendPercent: -17.7 }
  snapshot.revenue = { current: 1_234_500, previous: 1_000_000, trendPercent: 23.5 }
})

afterEach(() => {
  cleanup()
})

describe("DashboardStats", () => {
  it("renders one card per headline figure", () => {
    const { container } = renderWithProviders(<DashboardStats />)

    expect(container.querySelectorAll("[data-slot='card']")).toHaveLength(4)
  })

  it("labels each card with its translated heading", () => {
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("Revenue (30 days)")).toBeInTheDocument()
    expect(screen.getByText("Orders (30 days)")).toBeInTheDocument()
    expect(screen.getByText("New customers (30 days)")).toBeInTheDocument()
    expect(screen.getByText("Page views (30 days)")).toBeInTheDocument()
  })

  it("prices the revenue card in the snapshot currency", () => {
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("PLN 12,345.00")).toBeInTheDocument()
  })

  it("formats the non-money figures as plain grouped numbers", () => {
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("1,234")).toBeInTheDocument()
    expect(screen.getByText("48")).toBeInTheDocument()
    expect(screen.getByText("98,765")).toBeInTheDocument()
  })

  it("signs a rising trend and leaves a falling one negative", () => {
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("+23.5%")).toBeInTheDocument()
    expect(screen.getByText("-17.7%")).toBeInTheDocument()
  })

  it("compares every card against the same previous window", () => {
    renderWithProviders(<DashboardStats />)

    expect(screen.getAllByText("vs previous 30 days")).toHaveLength(4)
  })

  it("re-prices the revenue card when the store currency changes", () => {
    snapshot.currencyCode = "pln"
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("PLN 12,345.00")).toBeInTheDocument()
  })
})
