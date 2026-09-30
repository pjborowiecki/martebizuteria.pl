import { type JSX, type ReactNode } from "react"

import { type Table, createColumnHelper, useTable } from "@tanstack/react-table"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

type OrderRow = Order["adminListItem"]

export type OrdersTable = Table<DataGridFeatures, OrderRow>

export const orderRow = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  createdAt: new Date(2024, 0, 1),
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  email: "anna@example.com",
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED,
  id: "order-1",
  initials: "AK",
  itemCount: 2,
  paymentUiKey: "authorized",
  status: "pending",
  totalMinorUnits: 24_900,
  userId: "user-1",
  ...overrides,
})

export const HARNESS_ROWS: OrderRow[] = [
  orderRow(),
  orderRow({
    fulfillmentStatus: "shipped",
    fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED,
    id: "order-2",
    status: "processing",
  }),
  orderRow({
    fulfillmentStatus: "delivered",
    fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED,
    id: "order-3",
    status: "completed",
  }),
]

const helper = createColumnHelper<DataGridFeatures, OrderRow>()

const COLUMNS = helper.columns([
  helper.accessor("fulfillmentUiKey", {
    filterFn: "equalsString",
    header: "Fulfillment",
    id: ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment,
  }),
  helper.accessor("status", { filterFn: "equalsString", header: "Status", id: ADMIN_ORDER_TABLE_COLUMN_ID.status }),
])

const GridHarness = ({ children, onTable }: Readonly<{ children: ReactNode; onTable: (table: OrdersTable) => void }>): JSX.Element => {
  const table = useTable<DataGridFeatures, OrderRow>({
    columns: COLUMNS,
    data: HARNESS_ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })
  onTable(table)

  const value = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading: false,
    persistenceKey: ordersDataGrid.persistenceKey,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search orders",
    table,
  }

  return <ordersDataGrid.Provider value={value}>{children}</ordersDataGrid.Provider>
}

export const renderWithOrdersGrid = (node: ReactNode) => {
  const seen: { table?: OrdersTable } = {}

  renderWithProviders(
    <GridHarness
      onTable={(table) => {
        seen.table = table
      }}
    >
      {node}
    </GridHarness>,
  )

  return seen
}
