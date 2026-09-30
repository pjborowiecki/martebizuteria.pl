import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DashboardOverviewContent } from "~/src/presentation/components/custom/pages/admin/dashboard-overview-content"

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard-stats", () => ({
  DashboardStats: (): JSX.Element => <div data-testid="dashboard-stats" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard-charts", () => ({
  DashboardCharts: (): JSX.Element => <div data-testid="dashboard-charts" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard-recent-orders", () => ({
  DashboardRecentOrders: (): JSX.Element => <div data-testid="dashboard-recent-orders" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard-top-products", () => ({
  DashboardTopProducts: (): JSX.Element => <div data-testid="dashboard-top-products" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/dashboard-overview-fallback", () => ({
  DashboardOverviewFallback: (): JSX.Element => <div data-testid="dashboard-fallback" />,
}))

afterEach(cleanup)

describe("DashboardOverviewContent", () => {
  it("shows the four dashboard panels", () => {
    renderWithProviders(<DashboardOverviewContent />)

    expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument()
    expect(screen.getByTestId("dashboard-charts")).toBeInTheDocument()
    expect(screen.getByTestId("dashboard-recent-orders")).toBeInTheDocument()
    expect(screen.getByTestId("dashboard-top-products")).toBeInTheDocument()
  })

  it("keeps the skeleton out of the way once the panels are ready", () => {
    renderWithProviders(<DashboardOverviewContent />)

    expect(screen.queryByTestId("dashboard-fallback")).toBeNull()
  })

  it("pairs the recent orders with the top products in one grid", () => {
    renderWithProviders(<DashboardOverviewContent />)

    const grid = screen.getByTestId("dashboard-recent-orders").parentElement
    expect(grid).toContainElement(screen.getByTestId("dashboard-top-products"))
    expect(grid).not.toContainElement(screen.getByTestId("dashboard-charts"))
  })
})
