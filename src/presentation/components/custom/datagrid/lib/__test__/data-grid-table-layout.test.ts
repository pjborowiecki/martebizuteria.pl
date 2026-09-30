import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import {
  getDataGridColumnDefMinSize,
  getDataGridColumnWidth,
  getDataGridLayoutColumnWidth,
  getFixedDataGridColumnDefSize,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-widths"
import {
  columnAbsorbsTrailingSlack,
  columnFillUsesFlexWidth,
  columnFillsRemainingWidth,
  getDataGridContentWidth,
  getDataGridIntrinsicColumnsWidthSum,
  getDataGridTableMinWidth,
  readColumnDesignWidth,
  resolveDataGridTableLayout,
  sumDataGridLayoutColumnWidths,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface Row {
  readonly id: string
  readonly target: string
  readonly title: string
}

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, Row>()

const columns = columnHelper.columns([
  columnHelper.accessor("id", { enableResizing: false, maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("title", { maxSize: 400, minSize: 120, size: 200 }),
  columnHelper.accessor("target", { meta: { fillsRemainingWidth: true }, minSize: 200, size: 520 }),
])

const withAbsorber = columnHelper.columns([
  columnHelper.accessor("id", { enableResizing: false, maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("target", { meta: { fillsRemainingWidth: true }, minSize: 200, size: 520 }),
  columnHelper.accessor("title", { meta: { absorbsTrailingSlack: true }, minSize: 100, size: 320 }),
])

const noFillColumns = columnHelper.columns([
  columnHelper.accessor("id", { enableResizing: false, maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("title", { maxSize: 400, minSize: 120, size: 200 }),
])

const layoutColumns = (defs: (typeof columns)[number][], columnSizing: Record<string, number> = {}) => {
  const table = constructTable({ columns: defs, data: [], features })
  table.setColumnSizing(columnSizing)

  return table.getVisibleLeafColumns()
}

const layoutColumn = (defs: (typeof columns)[number][], columnId: string, columnSizing: Record<string, number> = {}) => {
  const column = layoutColumns(defs, columnSizing).find((candidate) => candidate.id === columnId)
  if (column === undefined) {
    throw new Error(`expected the ${columnId} column in the layout`)
  }

  return column
}

describe("column role flags", () => {
  it("recognises the fill column and the slack absorber", () => {
    expect(columnFillsRemainingWidth(layoutColumn(columns, "target"))).toBe(true)
    expect(columnFillsRemainingWidth(layoutColumn(columns, "title"))).toBe(false)
    expect(columnAbsorbsTrailingSlack(layoutColumn(columns, "id"))).toBe(false)
  })

  it("recognises an absorber column", () => {
    expect(columnAbsorbsTrailingSlack(layoutColumn(withAbsorber, "title"))).toBe(true)
  })

  it("only uses flex width while the shopper has not resized the fill column", () => {
    const flexTarget = layoutColumn(columns, "target")
    const sizedTarget = layoutColumn(columns, "target", { target: 600 })

    expect(columnFillUsesFlexWidth({ column: flexTarget, columnSizing: {} })).toBe(true)
    expect(columnFillUsesFlexWidth({ column: sizedTarget, columnSizing: { target: 600 } })).toBe(false)
  })
})

describe("reading widths from the column defs", () => {
  it("reads the declared size", () => {
    expect(readColumnDesignWidth(layoutColumn(columns, "title"))).toBe(200)
  })

  it("locks a non-resizable column to its def size regardless of persisted sizing", () => {
    const id = layoutColumn(columns, "id", { id: 400 })

    expect(getDataGridLayoutColumnWidth(id, { id: 400 })).toBe(48)
    expect(getFixedDataGridColumnDefSize(id)).toBe(48)
  })

  it("honours a persisted width for a resizable column", () => {
    expect(getDataGridLayoutColumnWidth(layoutColumn(columns, "title", { title: 300 }), { title: 300 })).toBe(300)
  })

  it("clamps a persisted width into the column's declared bounds", () => {
    expect(getDataGridLayoutColumnWidth(layoutColumn(columns, "title", { title: 80 }), { title: 80 })).toBe(120)
    expect(getDataGridLayoutColumnWidth(layoutColumn(columns, "title", { title: 900 }), { title: 900 })).toBe(400)
  })

  it("ignores persisted sizing for the slack absorber", () => {
    expect(getDataGridLayoutColumnWidth(layoutColumn(withAbsorber, "title", { title: 600 }), { title: 600 })).toBe(320)
  })

  it("reports the declared minimum where there is one", () => {
    expect(getDataGridColumnDefMinSize(layoutColumn(columns, "title"))).toBe(120)
    expect(getDataGridColumnWidth(layoutColumn(columns, "id"))).toBe(48)
  })
})

describe("resolveDataGridTableLayout", () => {
  it("declines to lay out a table that has not been measured yet", () => {
    expect(resolveDataGridTableLayout({ columnSizing: {}, columns: layoutColumns(columns), tableClientWidth: 0 })).toBeUndefined()
  })

  it("falls back to the intrinsic minimum when no column fills", () => {
    const layout = resolveDataGridTableLayout({ columnSizing: {}, columns: layoutColumns(noFillColumns), tableClientWidth: 1000 })

    expect(layout).toStrictEqual({ fillColumnIsUserSized: false, fillColumnWidth: 0, slackAbsorberColumnWidth: 0, tableWidth: 248 })
  })

  it("grows the fill column to the container width", () => {
    const layout = resolveDataGridTableLayout({ columnSizing: {}, columns: layoutColumns(columns), tableClientWidth: 1000 })

    expect(layout?.fillColumnWidth).toBe(752)
    expect(layout?.fillColumnIsUserSized).toBe(false)
    expect(layout?.tableWidth).toBe(1000)
  })

  it("never shrinks the fill column below its declared minimum", () => {
    const layout = resolveDataGridTableLayout({ columnSizing: {}, columns: layoutColumns(columns), tableClientWidth: 300 })

    expect(layout?.fillColumnWidth).toBe(200)
    expect(layout?.tableWidth).toBe(448)
  })

  it("keeps the shopper's width for a resized fill column when the table already overflows", () => {
    const columnSizing = { target: 600 }
    const layout = resolveDataGridTableLayout({ columnSizing, columns: layoutColumns(columns, columnSizing), tableClientWidth: 500 })

    expect(layout?.fillColumnIsUserSized).toBe(true)
    expect(layout?.fillColumnWidth).toBe(600)
    expect(layout?.tableWidth).toBe(848)
  })

  it("stretches a resized fill column rather than leaking slack into the utility columns", () => {
    const columnSizing = { target: 300 }
    const layout = resolveDataGridTableLayout({ columnSizing, columns: layoutColumns(columns, columnSizing), tableClientWidth: 1000 })

    expect(layout?.fillColumnWidth).toBe(752)
    expect(layout?.tableWidth).toBe(1000)
  })

  it("keeps the absorber at its design width while the fill column flexes", () => {
    const layout = resolveDataGridTableLayout({ columnSizing: {}, columns: layoutColumns(withAbsorber), tableClientWidth: 1000 })

    expect(layout?.slackAbsorberColumnWidth).toBe(320)
    expect(layout?.fillColumnWidth).toBe(632)
    expect(layout?.tableWidth).toBe(1000)
  })

  it("expands the absorber into the leftover space once the fill column is user sized", () => {
    const columnSizing = { target: 300 }
    const layout = resolveDataGridTableLayout({ columnSizing, columns: layoutColumns(withAbsorber, columnSizing), tableClientWidth: 1000 })

    expect(layout?.fillColumnWidth).toBe(300)
    expect(layout?.slackAbsorberColumnWidth).toBe(320)
  })

  it("shrinks the absorber to its minimum rather than overflowing the container", () => {
    const columnSizing = { target: 900 }
    const layout = resolveDataGridTableLayout({ columnSizing, columns: layoutColumns(withAbsorber, columnSizing), tableClientWidth: 1000 })

    expect(layout?.fillColumnWidth).toBe(900)
    expect(layout?.slackAbsorberColumnWidth).toBe(100)
  })

  it("ignores a persisted fill width that is not a finite number", () => {
    const columnSizing = { target: Number.NaN }
    const layout = resolveDataGridTableLayout({ columnSizing, columns: layoutColumns(columns, columnSizing), tableClientWidth: 1000 })

    expect(layout?.fillColumnIsUserSized).toBe(false)
  })
})

describe("width sums", () => {
  it("excludes the fill column and the absorber from the intrinsic sum", () => {
    expect(getDataGridIntrinsicColumnsWidthSum(layoutColumns(withAbsorber), {})).toBe(48)
    expect(getDataGridIntrinsicColumnsWidthSum(layoutColumns(columns), {})).toBe(248)
  })

  it("uses the fill column's minimum for the table minimum width", () => {
    expect(getDataGridTableMinWidth(layoutColumns(columns), {})).toBe(448)
  })

  it("uses a persisted fill width for the table minimum width", () => {
    expect(getDataGridTableMinWidth(layoutColumns(columns, { target: 600 }), { target: 600 })).toBe(848)
  })

  it("falls back to the minimum width for an unmeasured table", () => {
    expect(getDataGridContentWidth({ columnSizing: {}, columns: layoutColumns(columns), tableClientWidth: 0 })).toBe(448)
  })

  it("reports the resolved table width once measured", () => {
    expect(getDataGridContentWidth({ columnSizing: {}, columns: layoutColumns(columns), tableClientWidth: 1000 })).toBe(1000)
  })

  it("keeps the resolved column widths summing to the table width", () => {
    const resolved = layoutColumns(columns)
    const layout = resolveDataGridTableLayout({ columnSizing: {}, columns: resolved, tableClientWidth: 1000 })

    expect(sumDataGridLayoutColumnWidths(resolved, {}, layout)).toBe(layout?.tableWidth)
  })

  it("keeps the widths summing to the table width with an absorber present", () => {
    const resolved = layoutColumns(withAbsorber)
    const layout = resolveDataGridTableLayout({ columnSizing: {}, columns: resolved, tableClientWidth: 1000 })

    expect(sumDataGridLayoutColumnWidths(resolved, {}, layout)).toBe(layout?.tableWidth)
  })

  it("falls back to each column's design width when there is no layout", () => {
    expect(sumDataGridLayoutColumnWidths(layoutColumns(columns), {}, undefined)).toBe(768)
  })

  it("uses the fill column's minimum for the minimum width but its design width for the unlaid-out sum", () => {
    const resolved = layoutColumns(columns)

    expect(getDataGridTableMinWidth(resolved, {})).toBeLessThan(sumDataGridLayoutColumnWidths(resolved, {}, undefined))
  })
})
