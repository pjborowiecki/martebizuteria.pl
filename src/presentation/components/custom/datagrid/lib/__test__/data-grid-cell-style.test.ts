import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import { buildDataGridCellStyle } from "~/src/presentation/components/custom/datagrid/lib/data-grid-cell-style"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface Row {
  readonly email: string
  readonly title: string
}

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, Row>()

const columns = columnHelper.columns([
  columnHelper.display({ enableResizing: false, id: "select", maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("title", { maxSize: 400, minSize: 120, size: 200 }),
  columnHelper.accessor("email", { size: 160 }),
  columnHelper.display({ enableResizing: false, id: "actions", maxSize: 64, minSize: 64, size: 64 }),
])

const PIN_LAYOUT = { tableClientWidth: 900, tableWidth: 900 }

const createGrid = (pinning: { end?: string[]; start?: string[] } = {}) =>
  constructTable({
    columns,
    data: [{ email: "a@example.com", title: "Ring" }],
    features,
    initialState: { columnPinning: { end: pinning.end ?? [], start: pinning.start ?? [] } },
  })

const cellStyle = (input: {
  readonly columnId: string
  readonly isPinned: false | "start" | "end"
  readonly pinLayout?: { tableClientWidth: number; tableWidth: number }
  readonly table: ReturnType<typeof createGrid>
  readonly widthPx: number
}) => {
  const { columnId, isPinned, pinLayout = PIN_LAYOUT, table, widthPx } = input
  const column = table.getColumn(columnId)
  if (column === undefined) {
    throw new Error(`expected a column named ${columnId}`)
  }

  return buildDataGridCellStyle({ column, isPinned, persistenceKey: "admin.customers", pinLayout, table, widthPx })
}

describe("buildDataGridCellStyle", () => {
  it("gives an unpinned column a width but no sticky inset", () => {
    expect(cellStyle({ columnId: "title", isPinned: false, table: createGrid(), widthPx: 200 })).toStrictEqual({
      boxSizing: "border-box",
      maxWidth: "max(var(--marte-dg-admin-customers-title, 200px), 120px)",
      minWidth: "120px",
      width: "max(var(--marte-dg-admin-customers-title, 200px), 120px)",
    })
  })

  it("sticks the first start-pinned column to the leading edge", () => {
    expect(cellStyle({ columnId: "select", isPinned: "start", table: createGrid({ start: ["select"] }), widthPx: 48 })).toStrictEqual({
      boxSizing: "border-box",
      insetInlineStart: 0,
      maxWidth: "48px",
      minWidth: "48px",
      width: "48px",
    })
  })

  it("offsets a second start-pinned column by the width already pinned before it", () => {
    const style = cellStyle({ columnId: "title", isPinned: "start", table: createGrid({ start: ["select", "title"] }), widthPx: 200 })

    expect(style.insetInlineStart).toBe(48)
    expect(style.insetInlineEnd).toBeUndefined()
  })

  it("uses the persisted width of the preceding pinned column for the offset", () => {
    const table = createGrid({ start: ["select", "title"] })
    table.setColumnSizing({ title: 260 })

    expect(cellStyle({ columnId: "email", isPinned: "start", table, widthPx: 160 }).insetInlineStart).toBe(308)
  })

  it("sticks the last end-pinned column to the trailing edge", () => {
    const style = cellStyle({ columnId: "actions", isPinned: "end", table: createGrid({ end: ["actions"] }), widthPx: 64 })

    expect(style.insetInlineEnd).toBe(0)
    expect(style.insetInlineStart).toBeUndefined()
  })

  it("offsets an earlier end-pinned column by the columns pinned after it", () => {
    expect(
      cellStyle({ columnId: "email", isPinned: "end", table: createGrid({ end: ["email", "actions"] }), widthPx: 160 }).insetInlineEnd,
    ).toBe(64)
  })

  it("adds the slack between the table and its viewport to a trailing inset", () => {
    const style = cellStyle({
      columnId: "actions",
      isPinned: "end",
      pinLayout: { tableClientWidth: 900, tableWidth: 700 },
      table: createGrid({ end: ["actions"] }),
      widthPx: 64,
    })

    expect(style.insetInlineEnd).toBe(200)
  })
})
