import { type ColumnSizingState, constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import {
  getDataGridColumnLayoutWidth,
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

const sizeOnly = columnHelper.columns([columnHelper.accessor("title", { minSize: Number.NaN, size: 180 })])

const minSizeOnly = columnHelper.columns([columnHelper.accessor("title", { minSize: 90, size: Number.NaN })])

const unsized = columnHelper.columns([columnHelper.accessor("title", { minSize: Number.NaN, size: Number.NaN })])

const fillWithoutMinimum = columnHelper.columns([
  columnHelper.accessor("id", { enableResizing: false, maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("target", { meta: { fillsRemainingWidth: true }, minSize: Number.NaN, size: 300 }),
])

const fillWithAbsorber = columnHelper.columns([
  columnHelper.accessor("id", { enableResizing: false, maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("target", { meta: { fillsRemainingWidth: true }, minSize: 200, size: 520 }),
  columnHelper.accessor("title", { meta: { absorbsTrailingSlack: true }, minSize: 100, size: 320 }),
])

const layoutColumns = (defs: (typeof sizeOnly)[number][], columnSizing: ColumnSizingState = {}) => {
  const table = constructTable({ columns: defs, data: [], features })
  table.setColumnSizing(columnSizing)

  return table.getVisibleLeafColumns()
}

const layoutColumn = (defs: (typeof sizeOnly)[number][], columnId: string, columnSizing: ColumnSizingState = {}) => {
  const column = layoutColumns(defs, columnSizing).find((candidate) => candidate.id === columnId)
  if (column === undefined) {
    throw new Error(`expected the ${columnId} column in the layout`)
  }

  return column
}

describe("reading a width that is not a finite number", () => {
  it("reads the declared size when the minimum is not a finite number", () => {
    expect(readColumnDesignWidth(layoutColumn(sizeOnly, "title"))).toBe(180)
  })

  it("falls back to the declared minimum when the size is not a finite number", () => {
    expect(readColumnDesignWidth(layoutColumn(minSizeOnly, "title"))).toBe(90)
  })

  it("gives a column with neither a finite size nor a finite minimum no width at all", () => {
    expect(readColumnDesignWidth(layoutColumn(unsized, "title"))).toBe(0)
  })
})

describe("a fill column whose minimum is not a finite number", () => {
  it("treats the fill column's design width as the width it may not shrink below", () => {
    const columns = layoutColumns(fillWithoutMinimum)
    const layout = resolveDataGridTableLayout({ columnSizing: {}, columns, tableClientWidth: 100 })

    expect(layout?.fillColumnWidth).toBe(300)
    expect(layout?.tableWidth).toBe(348)
  })

  it("measures the narrowest table from the fill column's design width instead", () => {
    expect(getDataGridTableMinWidth(layoutColumns(fillWithoutMinimum), {})).toBe(348)
  })

  it("prefers a persisted fill width over the design width for the narrowest table", () => {
    const columnSizing = { target: 600 }

    expect(getDataGridTableMinWidth(layoutColumns(fillWithoutMinimum, columnSizing), columnSizing)).toBe(648)
  })
})

describe("the slack absorber beside a resized fill column", () => {
  it("shrinks the absorber to the space the resized fill column left it", () => {
    const columnSizing = { target: 700 }
    const columns = layoutColumns(fillWithAbsorber, columnSizing)
    const layout = resolveDataGridTableLayout({ columnSizing, columns, tableClientWidth: 1000 })
    const absorber = layoutColumn(fillWithAbsorber, "title", columnSizing)

    expect(layout?.fillColumnIsUserSized).toBe(true)
    expect(getDataGridColumnLayoutWidth(absorber, columnSizing, layout)).toBe(252)
  })

  it("keeps the resolved widths summing to the table width once the fill column is resized", () => {
    const columnSizing = { target: 700 }
    const columns = layoutColumns(fillWithAbsorber, columnSizing)
    const layout = resolveDataGridTableLayout({ columnSizing, columns, tableClientWidth: 1000 })

    expect(sumDataGridLayoutColumnWidths(columns, columnSizing, layout)).toBe(layout?.tableWidth)
  })

  it("never lets the absorber grow past its design width", () => {
    const columnSizing = { target: 200 }
    const columns = layoutColumns(fillWithAbsorber, columnSizing)
    const layout = resolveDataGridTableLayout({ columnSizing, columns, tableClientWidth: 2000 })
    const absorber = layoutColumn(fillWithAbsorber, "title", columnSizing)

    expect(getDataGridColumnLayoutWidth(absorber, columnSizing, layout)).toBe(320)
  })
})
