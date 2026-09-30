import { type ReactNode } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { DataGridLayoutProvider } from "~/src/presentation/components/custom/datagrid/components/data-grid-layout-context"
import { useDataGridColumnMetrics } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-column-metrics"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridTableLayout } from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface Row {
  readonly id: string
  readonly name: string
}

const columnHelper = createColumnHelper<DataGridFeatures, Row>()

const columns = columnHelper.columns([
  columnHelper.accessor("name", { header: "Name", id: "name", size: 180 }),
  columnHelper.accessor("id", { header: "Id", id: "id", meta: { fillsRemainingWidth: true }, size: 90 }),
])

const data: Row[] = [{ id: "1", name: "Aura Hoop" }]

const LAYOUT: DataGridTableLayout = {
  fillColumnIsUserSized: false,
  fillColumnWidth: 420,
  slackAbsorberColumnWidth: 0,
  tableWidth: 600,
}

const renderMetrics = (columnId: string, layout: DataGridTableLayout | undefined, persistenceKey: string) => {
  const grid = renderHook(() =>
    useDataGridInstance<Row>({
      columns,
      data,
      getRowId: (row) => row.id,
      initialColumnOrder: ["name", "id"],
      persistenceKey,
    }),
  )

  const column = grid.result.current.table.getColumn(columnId)
  if (column === undefined) {
    throw new Error(`unknown test column: ${columnId}`)
  }

  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <DataGridLayoutProvider value={{ tableClientWidth: 560, tableLayout: layout, tableWidth: layout?.tableWidth ?? 0 }}>
      {children}
    </DataGridLayoutProvider>
  )

  const metrics = renderHook(() => useDataGridColumnMetrics(column, grid.result.current.table), { wrapper })

  return { grid, metrics }
}

describe("useDataGridColumnMetrics", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it("passes the layout from the surrounding grid through", () => {
    const { metrics } = renderMetrics("name", LAYOUT, "grid:metrics:a")

    expect(metrics.result.current.tableLayout).toStrictEqual(LAYOUT)
    expect(metrics.result.current.pinLayout).toStrictEqual({ tableClientWidth: 560, tableWidth: 600 })
  })

  it("reports a zero table width when the grid has no layout yet", () => {
    const { metrics } = renderMetrics("name", undefined, "grid:metrics:b0")

    expect(metrics.result.current.tableLayout).toBeUndefined()
    expect(metrics.result.current.pinLayout).toStrictEqual({ tableClientWidth: 560, tableWidth: 0 })
  })

  it("uses the column's declared size when no layout is known", () => {
    const { metrics } = renderMetrics("name", undefined, "grid:metrics:b")

    expect(metrics.result.current.widthPx).toBe(180)
  })

  it("gives the fill column the width the layout computed", () => {
    const { metrics } = renderMetrics("id", LAYOUT, "grid:metrics:c")

    expect(metrics.result.current.widthPx).toBe(420)
  })

  it("keeps a fixed column at its declared size even with a layout", () => {
    const { metrics } = renderMetrics("name", LAYOUT, "grid:metrics:d")

    expect(metrics.result.current.widthPx).toBe(180)
  })

  it("reflects a user resize of the column", () => {
    const { grid, metrics } = renderMetrics("name", undefined, "grid:metrics:e")

    act(() => {
      grid.result.current.table.setColumnSizing({ name: 240 })
    })
    metrics.rerender()

    expect(metrics.result.current.widthPx).toBe(240)
  })
})
