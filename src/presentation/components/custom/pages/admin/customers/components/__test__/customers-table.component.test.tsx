import { type ReactNode } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type User } from "~/src/modules/user/user.types"

const { gridOptions, navigate } = vi.hoisted(
  (): {
    gridOptions: { onRowClick?: ((customer: { id: string }) => void) | undefined }
    navigate: Mock<(options: unknown) => void>
  } => ({ gridOptions: {}, navigate: vi.fn() }),
)

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate }
})
vi.mock("~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-data-grid", () => ({
  useCustomersDataGrid: (options: { onRowClick: (customer: { id: string }) => void }) => {
    gridOptions.onRowClick = options.onRowClick

    return { isLoading: false }
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid", () => ({
  customersDataGrid: {
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
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-stats", () => ({
  CustomersStats: () => <div data-testid="customers-stats" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-role-filter", () => ({
  CustomersRoleFilter: () => <div data-testid="filter-role" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-email-verified-filter", () => ({
  CustomersEmailVerifiedFilter: () => <div data-testid="filter-email-verified" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-banned-filter", () => ({
  CustomersBannedFilter: () => <div data-testid="filter-banned" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-numeric-column-filter", () => ({
  CustomersNumericColumnFilter: ({ columnId }: Readonly<{ columnId: string }>) => <div data-testid={`filter-numeric-${columnId}`} />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-date-column-filter", () => ({
  CustomersDateColumnFilter: ({ columnId }: Readonly<{ columnId: string }>) => <div data-testid={`filter-date-${columnId}`} />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-refresh-action", () => ({
  CustomersRefreshAction: () => <div data-testid="action-refresh" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/customers/components/customers-export-action", () => ({
  CustomersExportAction: () => <div data-testid="action-export" />,
}))

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"

import { CustomersTable } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-table"

import { ROUTES } from "~/src/routes"

afterEach(cleanup)

type CustomerRow = User["adminCustomerListItem"]

beforeEach(() => {
  navigate.mockReset()
  gridOptions.onRowClick = undefined
})

describe("CustomersTable", () => {
  it("shows the stats above the grid and the grid inside its shell", () => {
    renderWithProviders(<CustomersTable />)

    expect(screen.getByTestId("customers-stats")).toBeInTheDocument()
    expect(screen.getByTestId("grid-shell")).toBeInTheDocument()
    expect(screen.getByTestId("grid-body")).toBeInTheDocument()
    expect(screen.getByTestId("grid-pagination")).toBeInTheDocument()
  })

  it("offers the role, verification and ban filters in the toolbar", () => {
    renderWithProviders(<CustomersTable />)
    const filters = screen.getByTestId("grid-filters")

    expect(filters).toContainElement(screen.getByTestId("filter-role"))
    expect(filters).toContainElement(screen.getByTestId("filter-email-verified"))
    expect(filters).toContainElement(screen.getByTestId("filter-banned"))
  })

  it("filters the spend columns numerically and the order dates by date", () => {
    renderWithProviders(<CustomersTable />)

    expect(screen.getByTestId(`filter-numeric-${ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent}`)).toBeInTheDocument()
    expect(screen.getByTestId(`filter-numeric-${ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue}`)).toBeInTheDocument()
    expect(screen.getByTestId(`filter-date-${ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt}`)).toBeInTheDocument()
    expect(screen.getByTestId(`filter-date-${ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt}`)).toBeInTheDocument()
  })

  it("keeps refresh and export as toolbar actions rather than filters", () => {
    renderWithProviders(<CustomersTable />)

    expect(screen.getByTestId("grid-toolbar")).toContainElement(screen.getByTestId("action-refresh"))
    expect(screen.getByTestId("grid-filters")).not.toContainElement(screen.getByTestId("action-export"))
  })

  it("opens the customer detail page for the clicked row", () => {
    renderWithProviders(<CustomersTable />)

    gridOptions.onRowClick?.(customerRow())

    expect(navigate).toHaveBeenCalledWith({ params: { id: "user-7" }, to: ROUTES.ADMIN_CUSTOMER })
  })
})

const customerRow = (): CustomerRow => ({
  averageOrderValue: 12_000,
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  email: "anna@example.com",
  emailVerified: true,
  id: "user-7",
  image: null,
  isAnonymous: false,
  metadata: null,
  name: "Anna Kowalska",
  orderCount: 2,
  phone: null,
  role: "customer",
  stripeCustomerId: null,
  timezone: null,
  totalSpent: 24_000,
  twoFactorEnabled: false,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
})
