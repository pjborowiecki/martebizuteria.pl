import { createColumnHelper } from "@tanstack/react-table"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { useAdminDebouncedTableSearch } from "~/src/presentation/components/custom/datagrid/hooks/use-admin-debounced-table-search"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface Row {
  readonly id: string
  readonly name: string
}

const columnHelper = createColumnHelper<DataGridFeatures, Row>()

const columns = columnHelper.columns([columnHelper.accessor("name", { header: "Name", id: "name" })])

const data: Row[] = [{ id: "1", name: "Aura Hoop" }]

const renderSearch = (delay?: number) =>
  renderHook(() => {
    const { table } = useDataGridInstance<Row>({
      columns,
      data,
      getRowId: (row) => row.id,
      initialColumnOrder: ["name"],
      persistenceKey: "grid:search",
    })

    return { ...useAdminDebouncedTableSearch(table, delay), table }
  })

describe("useAdminDebouncedTableSearch", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    localStorage.clear()
  })

  it("starts with an empty search on both channels", () => {
    const { result } = renderSearch()

    expect(result.current.search).toBe("")
    expect(result.current.debouncedSearch).toBe("")
  })

  it("reports the typed term immediately and the debounced term only after the delay", () => {
    const { result } = renderSearch(300)

    act(() => {
      result.current.table.setGlobalFilter("Lune")
    })

    expect(result.current.search).toBe("Lune")
    expect(result.current.debouncedSearch).toBe("")

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.debouncedSearch).toBe("Lune")
  })

  it("trims the surrounding whitespace on both channels", () => {
    const { result } = renderSearch(300)

    act(() => {
      result.current.table.setGlobalFilter("  Lune Drop  ")
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.search).toBe("Lune Drop")
    expect(result.current.debouncedSearch).toBe("Lune Drop")
  })

  it("does not settle on an intermediate term while typing continues", () => {
    const { result } = renderSearch(300)

    act(() => {
      result.current.table.setGlobalFilter("Lu")
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.table.setGlobalFilter("Lune")
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.debouncedSearch).toBe("")

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.debouncedSearch).toBe("Lune")
  })

  it("honours a custom delay", () => {
    const { result } = renderSearch(50)

    act(() => {
      result.current.table.setGlobalFilter("Lune")
    })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(result.current.debouncedSearch).toBe("Lune")
  })

  it("clears both channels when the filter is emptied", () => {
    const { result } = renderSearch(300)

    act(() => {
      result.current.table.setGlobalFilter("Lune")
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      result.current.table.setGlobalFilter("")
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.search).toBe("")
    expect(result.current.debouncedSearch).toBe("")
  })
})
