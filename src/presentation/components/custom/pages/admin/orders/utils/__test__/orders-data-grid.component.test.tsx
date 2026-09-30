import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { ORDERS_DATA_GRID_KEY, ordersDataGrid } from "~/src/presentation/components/custom/pages/admin/orders/utils/orders-data-grid"

interface TestRow {
  id: string
  label: string
}

const testGrid = createDataGrid<TestRow>({ persistenceKey: "test.orders-grid" })

const rows: TestRow[] = [
  { id: "row-1", label: "First" },
  { id: "row-2", label: "Second" },
]

const getRowId = (row: TestRow) => row.id

const TestGridConsumer = (): JSX.Element => {
  const { persistenceKey, table } = testGrid.useDataGrid()

  return (
    <output>
      <span data-testid="persistence-key">{persistenceKey}</span>
      <span data-testid="labels">
        {table
          .getRowModel()
          .rows.map((row) => row.original.label)
          .join(",")}
      </span>
    </output>
  )
}

const TestGridHarness = ({ children }: Readonly<{ children: JSX.Element }>): JSX.Element => {
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance<TestRow>({
    columns: [{ accessorKey: "label", id: "label" }],
    data: rows,
    getRowId,
    initialColumnOrder: ["label"],
    persistenceKey: testGrid.persistenceKey,
  })

  return (
    <testGrid.Provider
      value={{
        columnReorder,
        hasPreferenceOverrides,
        isLoading: false,
        persistenceKey: testGrid.persistenceKey,
        resetPreferences,
        rowReorder: undefined,
        searchPlaceholder: "Search orders",
        table,
      }}
    >
      {children}
    </testGrid.Provider>
  )
}

const OrdersGridConsumer = (): JSX.Element => {
  ordersDataGrid.useDataGrid()

  return <span />
}

describe("ordersDataGrid", () => {
  afterEach(cleanup)

  it("persists admin order preferences under a stable key", () => {
    expect(ORDERS_DATA_GRID_KEY).toBe("admin.orders")
    expect(ordersDataGrid.persistenceKey).toBe(ORDERS_DATA_GRID_KEY)
  })

  it("refuses to be consumed outside its own provider", () => {
    expect(() => renderWithProviders(<OrdersGridConsumer />)).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })

  it("does not share a context with another grid built by the same factory", () => {
    expect(() =>
      renderWithProviders(
        <TestGridHarness>
          <OrdersGridConsumer />
        </TestGridHarness>,
      ),
    ).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })
})

describe("createDataGrid provider", () => {
  afterEach(cleanup)

  it("hands the grid value to consumers below it", () => {
    renderWithProviders(
      <TestGridHarness>
        <TestGridConsumer />
      </TestGridHarness>,
    )

    expect(screen.getByTestId("persistence-key")).toHaveTextContent("test.orders-grid")
    expect(screen.getByTestId("labels")).toHaveTextContent("First,Second")
  })
})
