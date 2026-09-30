import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"
import { type Order } from "~/src/modules/order/order.types"

import { DashboardRecentOrders } from "~/src/presentation/components/custom/pages/admin/dashboard-recent-orders"
import { DashboardStats } from "~/src/presentation/components/custom/pages/admin/dashboard-stats"
import { DashboardTopProducts } from "~/src/presentation/components/custom/pages/admin/dashboard-top-products"

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot", () => ({
  useAdminDashboardSnapshot: () => ({ data: snapshotRef.current }),
}))

const FLAT_STAT = { current: 0, previous: 0, trendPercent: 0 }

const emptySnapshot = (): AdminDashboard["snapshot"] => ({
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

const snapshotRef: { current: AdminDashboard["snapshot"] } = { current: emptySnapshot() }

const orderRow = (overrides: Partial<Order["adminListItem"]> = {}): Order["adminListItem"] => ({
  createdAt: new Date("2026-03-14T10:00:00.000Z"),
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  email: "anna@example.test",
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: "unfulfilled",
  id: "ORD-1",
  initials: "AK",
  itemCount: 2,
  paymentUiKey: "paid",
  status: "completed",
  totalMinorUnits: 24_900,
  userId: null,
  ...overrides,
})

afterEach(() => {
  cleanup()
  snapshotRef.current = emptySnapshot()
})

describe("DashboardStats", () => {
  it("labels all four key figures", () => {
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("Revenue (30 days)")).toBeInTheDocument()
    expect(screen.getByText("Orders (30 days)")).toBeInTheDocument()
    expect(screen.getByText("New customers (30 days)")).toBeInTheDocument()
    expect(screen.getByText("Page views (30 days)")).toBeInTheDocument()
  })

  it("formats revenue as money and the other figures as plain counts", () => {
    snapshotRef.current = {
      ...emptySnapshot(),
      customers: { current: 1234, previous: 1000, trendPercent: 23 },
      revenue: { current: 1_234_500, previous: 1_000_000, trendPercent: 23 },
    }
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("PLN 12,345.00")).toBeInTheDocument()
    expect(screen.getByText("1,234")).toBeInTheDocument()
    expect(screen.getAllByText("+23%")).toHaveLength(2)
  })

  it("shows the trend of each figure against the previous period", () => {
    snapshotRef.current = {
      ...emptySnapshot(),
      orders: { current: 10, previous: 20, trendPercent: -50 },
    }
    renderWithProviders(<DashboardStats />)

    expect(screen.getByText("-50%")).toBeInTheDocument()
    expect(screen.getAllByText("vs previous 30 days")).toHaveLength(4)
  })
})

describe("DashboardTopProducts", () => {
  it("says there is no sales data yet when the list is empty", () => {
    renderWithProviders(<DashboardTopProducts />)

    expect(screen.getByText("No product sales data yet.")).toBeInTheDocument()
  })

  it("lists each product with its revenue and the number sold", () => {
    snapshotRef.current = {
      ...emptySnapshot(),
      topProducts: [
        {
          category: "Rings",
          currencyCode: "PLN",
          imageUrl: "https://example.test/ring.jpg",
          name: "Silver ring",
          productId: "p-1",
          revenueMinorUnits: 129_900,
          sold: 42,
        },
      ],
    }
    const { container } = renderWithProviders(<DashboardTopProducts />)

    expect(screen.getByText("Silver ring")).toBeInTheDocument()
    expect(screen.getByText("Rings")).toBeInTheDocument()
    expect(screen.getByText("42 sold")).toBeInTheDocument()
    expect(screen.getByText("PLN 1,299.00")).toBeInTheDocument()
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.test/ring.jpg")
  })

  it("falls back to the uncategorized label for a product with no category", () => {
    snapshotRef.current = {
      ...emptySnapshot(),
      topProducts: [
        {
          category: "",
          currencyCode: "PLN",
          imageUrl: undefined,
          name: "Silver ring",
          productId: "p-1",
          revenueMinorUnits: 1000,
          sold: 1,
        },
      ],
    }
    renderWithProviders(<DashboardTopProducts />)

    expect(screen.getByText("Uncategorized")).toBeInTheDocument()
  })

  it("shows the first two letters of the name when there is no image", () => {
    snapshotRef.current = {
      ...emptySnapshot(),
      topProducts: [
        {
          category: "Rings",
          currencyCode: "PLN",
          imageUrl: undefined,
          name: "silver ring",
          productId: "p-1",
          revenueMinorUnits: 1000,
          sold: 1,
        },
      ],
    }
    renderWithProviders(<DashboardTopProducts />)

    expect(screen.getByText("SI")).toBeInTheDocument()
  })
})

describe("DashboardRecentOrders", () => {
  it("says there are no orders yet instead of rendering an empty table", () => {
    renderWithProviders(<DashboardRecentOrders />)

    expect(screen.getByText("No orders yet.")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("renders one row per order with the customer, the total and the statuses", () => {
    snapshotRef.current = { ...emptySnapshot(), recentOrders: [orderRow()] }
    renderWithProviders(<DashboardRecentOrders />)

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByText("#ORD-1")).toBeInTheDocument()
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("AK")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
    expect(screen.getByText("Unfulfilled")).toBeInTheDocument()
    expect(screen.getByText("PLN 249.00")).toBeInTheDocument()
    expect(screen.getByText("Mar 14, 2026")).toBeInTheDocument()
  })

  it("renders every column header of the table", () => {
    snapshotRef.current = { ...emptySnapshot(), recentOrders: [orderRow()] }
    renderWithProviders(<DashboardRecentOrders />)

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent)

    expect(headers).toStrictEqual(["Order", "Customer", "Date", "Total", "Payment", "Fulfillment"])
  })

  it("marks a shipped order with the shipped label rather than the paid badge style", () => {
    snapshotRef.current = {
      ...emptySnapshot(),
      recentOrders: [orderRow({ fulfillmentUiKey: "shipped", paymentUiKey: "authorized" })],
    }
    renderWithProviders(<DashboardRecentOrders />)

    expect(screen.getByText("Shipped")).toBeInTheDocument()
    expect(screen.getByText("Authorized")).toBeInTheDocument()
    expect(screen.queryByText("Paid")).not.toBeInTheDocument()
  })
})
