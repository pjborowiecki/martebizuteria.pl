import { createColumnHelper } from "@tanstack/react-table"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

interface Row {
  readonly id: string
  readonly name: string
  readonly status: string
}

const columnHelper = createColumnHelper<DataGridFeatures, Row>()

const columns = columnHelper.columns([
  columnHelper.accessor("name", { header: "Name", id: "name", minSize: 100 }),
  columnHelper.accessor("status", { header: "Status", id: "status" }),
])

const initialColumnOrder = getDataGridColumnIds(columns)

const data: Row[] = [
  { id: "1", name: "Aura Hoop", status: "active" },
  { id: "2", name: "Lune Drop", status: "draft" },
  { id: "3", name: "Eclipse Cuff", status: "active" },
]

const renderInstance = (persistenceKey: string, overrides: Partial<Parameters<typeof useDataGridInstance<Row>>[0]> = {}) =>
  renderHook(() =>
    useDataGridInstance<Row>({
      columns,
      data,
      getRowId: (row) => row.id,
      initialColumnOrder,
      persistenceKey,
      ...overrides,
    }),
  )

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("useDataGridInstance", () => {
  it("builds a table over the rows, keyed by the row id", () => {
    const { result } = renderInstance("grid:instance:a")

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["1", "2", "3"])
  })

  it("starts on the canonical column order with no preference overrides", () => {
    const { result } = renderInstance("grid:instance:b")

    expect(result.current.table.atoms.columnOrder.get()).toStrictEqual(["name", "status"])
    expect(result.current.hasPreferenceOverrides).toBe(false)
  })

  it("filters rows with the global filter", () => {
    const { result } = renderInstance("grid:instance:c")

    act(() => {
      result.current.table.setGlobalFilter("lune")
    })

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["2"])
  })

  it("sorts rows when a column is sorted", () => {
    const { result } = renderInstance("grid:instance:d")

    act(() => {
      result.current.table.setSorting([{ desc: false, id: "name" }])
    })

    expect(result.current.table.getRowModel().rows.map((row) => row.original.name)).toStrictEqual([
      "Aura Hoop",
      "Eclipse Cuff",
      "Lune Drop",
    ])
  })

  it("reports the sorting to the owner when sorting is controlled", () => {
    const onSortingChange = vi.fn(() => {})
    const { result } = renderInstance("grid:instance:e", { onSortingChange, sorting: [] })

    act(() => {
      result.current.table.setSorting([{ desc: true, id: "name" }])
    })

    expect(onSortingChange).toHaveBeenCalledWith([{ desc: true, id: "name" }])
  })

  it("reports column filter changes to the owner", () => {
    const onColumnFiltersChange = vi.fn(() => {})
    const { result } = renderInstance("grid:instance:f", { onColumnFiltersChange })

    act(() => {
      result.current.table.setColumnFilters([{ id: "status", value: "active" }])
    })

    expect(onColumnFiltersChange).toHaveBeenCalledWith([{ id: "status", value: "active" }])
  })

  it("accepts replacement filter state through the table callback contract", () => {
    const onColumnFiltersChange = vi.fn(() => {})
    const { result } = renderInstance("grid:instance:replace-filters", { onColumnFiltersChange })

    act(() => {
      result.current.table.options.onColumnFiltersChange?.([{ id: "status", value: "draft" }])
    })

    expect(onColumnFiltersChange).toHaveBeenCalledWith([{ id: "status", value: "draft" }])
    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toStrictEqual(["2"])
  })

  it("resolves functional sorting updates against the owner's current sorting", () => {
    const onSortingChange = vi.fn(() => {})
    const { result } = renderInstance("grid:instance:sort-updater", {
      onSortingChange,
      sorting: [{ desc: false, id: "status" }],
    })

    act(() => {
      result.current.table.options.onSortingChange?.((previous) => [...previous, { desc: true, id: "name" }])
    })

    expect(onSortingChange).toHaveBeenCalledExactlyOnceWith([
      { desc: false, id: "status" },
      { desc: true, id: "name" },
    ])
  })

  it("replaces sorting through the table callback contract", () => {
    const { result } = renderInstance("grid:instance:replace-sorting")

    act(() => {
      result.current.table.options.onSortingChange?.([{ desc: true, id: "name" }])
    })

    expect(result.current.table.atoms.sorting.get()).toStrictEqual([{ desc: true, id: "name" }])
    expect(result.current.table.getRowModel().rows.map((row) => row.original.name)).toStrictEqual([
      "Lune Drop",
      "Eclipse Cuff",
      "Aura Hoop",
    ])
  })

  it("rounds an unsupported default page size up to the next supported one", () => {
    const { result } = renderInstance("grid:instance:g", { defaultPageSize: 2 })

    expect(result.current.table.atoms.pagination.get().pageSize).toBe(10)
  })

  it("keeps a supported default page size", () => {
    const { result } = renderInstance("grid:instance:g2", { defaultPageSize: 25 })

    expect(result.current.table.atoms.pagination.get().pageSize).toBe(25)
    expect(result.current.table.getRowModel().rows).toHaveLength(data.length)
  })

  it("hands pagination to the owner when it is controlled", () => {
    const onPaginationChange = vi.fn(() => {})
    renderInstance("grid:instance:h", {
      manualPagination: true,
      onPaginationChange,
      pageCount: 5,
      pagination: { pageIndex: 1, pageSize: 10 },
      rowCount: 42,
    })

    expect(onPaginationChange).not.toHaveBeenCalled()
  })

  it("exposes the owner's page and row counts", () => {
    const { result } = renderInstance("grid:instance:i", {
      manualPagination: true,
      pageCount: 5,
      pagination: { pageIndex: 1, pageSize: 10 },
      rowCount: 42,
    })

    expect(result.current.table.getPageCount()).toBe(5)
    expect(result.current.table.getRowCount()).toBe(42)
  })
})

describe("useDataGridInstance selection and layout", () => {
  it("selects rows when row selection is enabled", () => {
    const { result } = renderInstance("grid:instance:j")

    act(() => {
      result.current.table.getRowModel().rows[0]?.toggleSelected(true)
    })

    expect(result.current.table.getSelectedRowModel().rows.map((row) => row.id)).toStrictEqual(["1"])
  })

  it("does not select rows when row selection is disabled", () => {
    const { result } = renderInstance("grid:instance:k", { enableRowSelection: false })

    act(() => {
      result.current.table.getRowModel().rows[0]?.toggleSelected(true)
    })

    expect(result.current.table.getSelectedRowModel().rows).toHaveLength(0)
  })

  it("reorders columns through the drag api and records the override", () => {
    const { result } = renderInstance("grid:instance:l")

    act(() => {
      result.current.columnReorder.onColumnDragStart("status")
    })
    act(() => {
      result.current.columnReorder.onColumnDragOver("name")
    })

    expect(result.current.table.atoms.columnOrder.get()).toStrictEqual(["status", "name"])
    expect(result.current.hasPreferenceOverrides).toBe(true)
  })

  it("hides a column through the table and reports the override", () => {
    const { result } = renderInstance("grid:instance:m")

    act(() => {
      result.current.table.getColumn("status")?.toggleVisibility(false)
    })

    expect(result.current.table.atoms.columnVisibility.get()["status"]).toBe(false)
    expect(result.current.hasPreferenceOverrides).toBe(true)
  })

  it("restores the canonical layout when preferences are reset", () => {
    const { result } = renderInstance("grid:instance:n")

    act(() => {
      result.current.columnReorder.onColumnDragStart("status")
    })
    act(() => {
      result.current.columnReorder.onColumnDragOver("name")
    })
    act(() => {
      result.current.resetPreferences()
    })

    expect(result.current.table.atoms.columnOrder.get()).toStrictEqual(["name", "status"])
    expect(result.current.hasPreferenceOverrides).toBe(false)
  })

  it("pins the columns the owner asks for", () => {
    const { result } = renderInstance("grid:instance:o", { initialColumnPinning: { end: [], start: ["name"] } })

    expect(result.current.table.atoms.columnPinning.get().start).toStrictEqual(["name"])
  })

  it("hides the columns the owner hides by default", () => {
    const { result } = renderInstance("grid:instance:p", { defaultColumnVisibility: { status: false } })

    expect(result.current.table.atoms.columnVisibility.get()["status"]).toBe(false)
    expect(result.current.hasPreferenceOverrides).toBe(false)
  })
})
