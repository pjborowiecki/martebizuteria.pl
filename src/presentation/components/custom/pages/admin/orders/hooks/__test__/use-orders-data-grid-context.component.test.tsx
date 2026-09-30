import { type JSX, type ReactNode } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/modules/order/use-cases/get-admin-orders-page", () => ({
  getAdminOrdersPageQuery: (input: unknown) => ({ queryFn: () => Promise.resolve(undefined), queryKey: ["admin", "orders", input] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/orders/components/orders-columns", () => ({
  useOrderColumns: () => [],
}))

import { type Order } from "~/src/modules/order/order.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import {
  type OrdersDataGridValue,
  useOrdersDataGridContext,
} from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"
import { ORDERS_DATA_GRID_KEY, ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

type OrderRow = Order["adminListItem"]

const helper = createColumnHelper<DataGridFeatures, OrderRow>()

const COLUMNS = helper.columns([helper.accessor("status", { header: "Status", id: "status" })])

const StatFilterProbe = (): JSX.Element => {
  const { activeStatFilter } = useOrdersDataGridContext()

  return <p data-testid="stat-filter">{activeStatFilter ?? "none"}</p>
}

const ProviderHarness = ({ children, withOrdersApi }: Readonly<{ children: ReactNode; withOrdersApi: boolean }>): JSX.Element => {
  const table = useTable<DataGridFeatures, OrderRow>({
    columns: COLUMNS,
    data: [],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  const base: DataGridContextValue<OrderRow> = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading: false,
    persistenceKey: ORDERS_DATA_GRID_KEY,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search orders",
    table,
  }

  const ordersValue: OrdersDataGridValue = {
    ...base,
    activeStatFilter: "pending",
    applyOrderStatFilter: () => {},
    exportListInput: {},
  }

  return <ordersDataGrid.Provider value={withOrdersApi ? ordersValue : base}>{children}</ordersDataGrid.Provider>
}

afterEach(cleanup)

describe("useOrdersDataGridContext", () => {
  it("hands back the orders grid value when the orders table provides it", () => {
    renderWithProviders(
      <ProviderHarness withOrdersApi>
        <StatFilterProbe />
      </ProviderHarness>,
    )

    expect(screen.getByTestId("stat-filter")).toHaveTextContent("pending")
  })

  it("refuses a plain data grid that carries no orders filter api", () => {
    expect(() =>
      renderWithProviders(
        <ProviderHarness withOrdersApi={false}>
          <StatFilterProbe />
        </ProviderHarness>,
      ),
    ).toThrow("useOrdersDataGridContext must be used within the orders table Provider.")
  })
})
