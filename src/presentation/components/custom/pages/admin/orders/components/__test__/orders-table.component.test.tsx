import { type ReactNode } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Order } from "~/src/modules/order/order.types"

const { gridOptions, navigate } = vi.hoisted(
  (): {
    gridOptions: { onRowClick?: ((order: { id: string }) => void) | undefined }
    navigate: Mock<(options: unknown) => void>
  } => ({ gridOptions: {}, navigate: vi.fn() }),
)

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate }
})
vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid", () => ({
  useOrdersDataGrid: (options: { onRowClick: (order: { id: string }) => void }) => {
    gridOptions.onRowClick = options.onRowClick

    return { isLoading: false }
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid", () => ({
  ordersDataGrid: {
    Body: () => <div data-testid="grid-body" />,
    Pagination: () => <div data-testid="grid-pagination" />,
    Provider: ({ children }: Readonly<{ children: ReactNode }>) => <div data-testid="grid-provider">{children}</div>,
    Toolbar: ({ children, filters }: Readonly<{ children: ReactNode; filters: ReactNode }>) => (
      <div data-testid="grid-toolbar">
        <div data-testid="grid-filters">{filters}</div>
        {children}
      </div>
    ),
  },
}))
vi.mock("~/src/presentation/components/custom/datagrid/components/data-grid-shell", () => ({
  DataGridShell: ({ children }: Readonly<{ children: ReactNode }>) => <div data-testid="grid-shell">{children}</div>,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-stats", () => ({
  OrdersStats: () => <div data-testid="orders-stats" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-status-filter", () => ({
  OrdersStatusFilter: () => <div data-testid="filter-status" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-payment-filter", () => ({
  OrdersPaymentFilter: () => <div data-testid="filter-payment" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-fulfillment-filter", () => ({
  OrdersFulfillmentFilter: () => <div data-testid="filter-fulfillment" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-numeric-column-filter", () => ({
  OrdersNumericColumnFilter: ({ columnId }: Readonly<{ columnId: string }>) => <div data-testid={`filter-numeric-${columnId}`} />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-date-column-filter", () => ({
  OrdersDateColumnFilter: ({ columnId }: Readonly<{ columnId: string }>) => <div data-testid={`filter-date-${columnId}`} />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-refresh-action", () => ({
  OrdersRefreshAction: () => <div data-testid="action-refresh" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-export-action", () => ({
  OrdersExportAction: () => <div data-testid="action-export" />,
}))

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"

import { OrdersTable } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-table"

afterEach(cleanup)

const orderRow = (): Order["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  email: "anna@example.com",
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED,
  id: "order-42",
  initials: "AK",
  itemCount: 2,
  paymentUiKey: "authorized",
  status: "pending",
  totalMinorUnits: 24_900,
  userId: "user-1",
})

beforeEach(() => {
  navigate.mockReset()
  gridOptions.onRowClick = undefined
})

describe("OrdersTable", () => {
  it("shows the stats above the grid and the grid inside its shell", () => {
    renderWithProviders(<OrdersTable />)

    expect(screen.getByTestId("orders-stats")).toBeInTheDocument()
    expect(screen.getByTestId("grid-shell")).toBeInTheDocument()
    expect(screen.getByTestId("grid-body")).toBeInTheDocument()
    expect(screen.getByTestId("grid-pagination")).toBeInTheDocument()
  })

  it("offers the status, payment and fulfillment filters in the toolbar", () => {
    renderWithProviders(<OrdersTable />)
    const filters = screen.getByTestId("grid-filters")

    expect(filters).toContainElement(screen.getByTestId("filter-status"))
    expect(filters).toContainElement(screen.getByTestId("filter-payment"))
    expect(filters).toContainElement(screen.getByTestId("filter-fulfillment"))
  })

  it("filters the order total numerically and the order date by date", () => {
    renderWithProviders(<OrdersTable />)

    expect(screen.getByTestId(`filter-numeric-${ADMIN_ORDER_TABLE_COLUMN_ID.total}`)).toBeInTheDocument()
    expect(screen.getByTestId(`filter-date-${ADMIN_ORDER_TABLE_COLUMN_ID.createdAt}`)).toBeInTheDocument()
  })

  it("keeps refresh and export as toolbar actions rather than filters", () => {
    renderWithProviders(<OrdersTable />)

    expect(screen.getByTestId("grid-toolbar")).toContainElement(screen.getByTestId("action-refresh"))
    expect(screen.getByTestId("grid-toolbar")).toContainElement(screen.getByTestId("action-export"))
    expect(screen.getByTestId("grid-filters")).not.toContainElement(screen.getByTestId("action-export"))
  })

  it("opens the order detail page for the clicked row", () => {
    renderWithProviders(<OrdersTable />)

    gridOptions.onRowClick?.(orderRow())

    expect(navigate).toHaveBeenCalledWith({ params: { orderId: "order-42" }, to: "/admin/orders/$orderId" })
  })
})
