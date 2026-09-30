import { type JSX } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { createDataGrid } from "~/src/presentation/components/custom/datagrid/components/create-data-grid"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

import { DataGridHarness, HARNESS_ROWS, type HarnessRow, type HarnessTable, stubResizeObserver } from "./data-grid-harness"

stubResizeObserver()

const DataGrid = createDataGrid<HarnessRow>({ persistenceKey: "test.create-data-grid" })

const contextValue = (table: HarnessTable): DataGridContextValue<HarnessRow> => ({
  columnReorder: {
    draggedColumnId: undefined,
    onColumnDragEnd: vi.fn<() => void>(),
    onColumnDragOver: vi.fn<(overId: string) => void>(),
    onColumnDragStart: vi.fn<(id: string) => void>(),
  },
  hasPreferenceOverrides: false,
  isLoading: false,
  persistenceKey: "test.create-data-grid",
  resetPreferences: vi.fn<() => void>(),
  rowReorder: undefined,
  searchPlaceholder: "Search products",
  table,
})

const ContextProbe = (): JSX.Element => {
  const { persistenceKey, searchPlaceholder } = DataGrid.useDataGrid()

  return <output>{`${persistenceKey}:${searchPlaceholder}`}</output>
}

const renderGrid = (children: JSX.Element) =>
  renderWithProviders(
    <DataGridHarness>{(table) => <DataGrid.Provider value={contextValue(table)}>{children}</DataGrid.Provider>}</DataGridHarness>,
  )

describe("createDataGrid", () => {
  afterEach(() => {
    cleanup()
  })

  it("keeps the persistence key it was created with", () => {
    expect(DataGrid.persistenceKey).toBe("test.create-data-grid")
  })

  it("refuses to hand out a grid context outside its provider", () => {
    expect(() => render(<ContextProbe />)).toThrow("useDataGrid must be used within <DataGrid.Provider>")
  })

  it("publishes the context value to descendants", () => {
    renderGrid(<ContextProbe />)

    expect(screen.getByRole("status")).toHaveTextContent("test.create-data-grid:Search products")
  })

  it("wires the toolbar to the context search placeholder", () => {
    renderGrid(<DataGrid.Toolbar />)

    expect(screen.getByRole("searchbox", { name: "Search products" })).toBeInTheDocument()
  })

  it("renders the body from the context table", () => {
    renderGrid(<DataGrid.Body />)

    expect(screen.getByText("Silver ring")).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(HARNESS_ROWS.length + 1)
  })

  it("renders the pagination from the context table", () => {
    renderGrid(<DataGrid.Pagination />)

    expect(screen.getByText("1–3 of 3")).toBeInTheDocument()
  })

  it("gives separate grids separate contexts", () => {
    const other = createDataGrid<HarnessRow>({ persistenceKey: "test.other-grid" })

    expect(other.persistenceKey).toBe("test.other-grid")
    expect(other.useDataGrid).not.toBe(DataGrid.useDataGrid)
  })
})
