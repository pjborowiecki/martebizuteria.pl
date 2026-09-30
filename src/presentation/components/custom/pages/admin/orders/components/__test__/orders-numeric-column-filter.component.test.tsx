import { type JSX, type ReactNode } from "react"

import { type Table, createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { OrdersNumericColumnFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-numeric-column-filter"
import { ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

afterEach(cleanup)

type OrderRow = Order["adminListItem"]

const row = (id: string, totalMinorUnits: number): OrderRow => ({
  createdAt: new Date(2024, 0, 1),
  currencyCode: "PLN",
  customerName: "Anna Kowalska",
  email: "anna@example.com",
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: ADMIN_ORDER_FULFILLMENT_UI_KEY.UNFULFILLED,
  id,
  initials: "AK",
  itemCount: 2,
  paymentUiKey: "authorized",
  status: "pending",
  totalMinorUnits,
  userId: "user-1",
})

const helper = createColumnHelper<DataGridFeatures, OrderRow>()

const COLUMNS = helper.columns([
  helper.accessor("totalMinorUnits", { filterFn: "inNumberRange", header: "Total", id: ADMIN_ORDER_TABLE_COLUMN_ID.total }),
])

const Harness = ({ children, onTable }: Readonly<{ children: ReactNode; onTable: (table: OrdersTable) => void }>): JSX.Element => {
  const table = useTable<DataGridFeatures, OrderRow>({
    columns: COLUMNS,
    data: [row("order-1", 10_000), row("order-2", 50_000)],
    features: dataGridFeatures,
    getRowId: (item) => item.id,
  })
  onTable(table)

  return (
    <ordersDataGrid.Provider
      value={{
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
      }}
    >
      {children}
    </ordersDataGrid.Provider>
  )
}

type OrdersTable = Table<DataGridFeatures, OrderRow>

const renderFilter = () => {
  const seen: { table?: OrdersTable } = {}
  renderWithProviders(
    <Harness
      onTable={(table) => {
        seen.table = table
      }}
    >
      <OrdersNumericColumnFilter ariaLabelKey="filter.total" columnId={ADMIN_ORDER_TABLE_COLUMN_ID.total} labelKey="columns.total" />
    </Harness>,
  )

  return seen
}

const trigger = () => screen.getByRole("button", { name: "Filter by total" })

describe("OrdersNumericColumnFilter", () => {
  it("labels the closed filter with the total column heading", () => {
    renderFilter()

    expect(trigger()).toHaveTextContent("Total")
  })

  it("offers every numeric condition in the admin language", async () => {
    renderFilter()

    await userEvent.click(trigger())

    expect(await screen.findByText("Condition")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("combobox"))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual([
      "At least",
      "More than",
      "Exactly",
      "Less than",
      "At most",
      "Between",
    ])
  })

  it("filters the orders down to the totals at or above the entered amount", async () => {
    const seen = renderFilter()
    await userEvent.click(trigger())

    await userEvent.type(await screen.findByRole("textbox", { name: "Amount" }), "200.00")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.total)?.getFilterValue()).toStrictEqual({
      amountMinorUnits: 20_000,
      operator: "gte",
    })
  })

  it("summarises the applied filter on the trigger", async () => {
    renderFilter()
    await userEvent.click(trigger())
    await userEvent.type(await screen.findByRole("textbox", { name: "Amount" }), "200.00")

    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(trigger()).toHaveTextContent("≥ 200.00")
  })

  it("keeps the filter unapplied while no amount has been entered", async () => {
    const seen = renderFilter()
    await userEvent.click(trigger())

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDisabled()
    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.total)?.getFilterValue()).toBeUndefined()
  })

  it("drops the filter again from the clear button", async () => {
    const seen = renderFilter()
    await userEvent.click(trigger())
    await userEvent.type(await screen.findByRole("textbox", { name: "Amount" }), "200.00")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole("button", { name: "Clear" }))

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.total)?.getFilterValue()).toBeUndefined()
    expect(trigger()).toHaveTextContent("Total")
  })
})
