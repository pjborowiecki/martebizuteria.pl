import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { describe, expect, it } from "vite-plus/test"

import {
  getDataGridColumnDefMinSize,
  getDataGridColumnWidth,
  getDataGridLayoutColumnWidth,
  getFixedDataGridColumnDefSize,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-widths"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface Row {
  readonly bounded: string
  readonly boundless: string
  readonly locked: string
  readonly pinned: string
  readonly unbounded: string
  readonly unsized: string
  readonly withoutMinimum: string
}

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, Row>()

const columns = columnHelper.columns([
  columnHelper.accessor("locked", { enableResizing: false, maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("bounded", { maxSize: 400, minSize: 120, size: 200 }),
  columnHelper.accessor("unbounded", { minSize: 120, size: 200 }),
  columnHelper.accessor("pinned", { enableResizing: false, maxSize: 64, minSize: 64, size: Number.NaN }),
  columnHelper.accessor("unsized", { enableResizing: false, maxSize: 400, minSize: 120, size: Number.NaN }),
  columnHelper.accessor("boundless", { maxSize: Number.NaN, minSize: 120, size: 200 }),
  columnHelper.accessor("withoutMinimum", { minSize: Number.NaN, size: 200 }),
])

const gridColumn = (columnId: string, columnSizing: Record<string, number> = {}) => {
  const table = constructTable({ columns, data: [], features })
  table.setColumnSizing(columnSizing)
  const column = table.getVisibleLeafColumns().find((candidate) => candidate.id === columnId)
  if (column === undefined) {
    throw new Error(`expected the ${columnId} column`)
  }

  return column
}

describe("getFixedDataGridColumnDefSize", () => {
  it("takes the declared size of a locked column", () => {
    expect(getFixedDataGridColumnDefSize(gridColumn("locked"))).toBe(48)
  })

  it("takes the declared size even when the column may be resized", () => {
    expect(getFixedDataGridColumnDefSize(gridColumn("bounded"))).toBe(200)
  })

  it("pins a column with equal bounds and no usable size to those bounds", () => {
    expect(getFixedDataGridColumnDefSize(gridColumn("pinned"))).toBe(64)
  })

  it("reports no fixed size for a column whose bounds leave room to grow", () => {
    expect(getFixedDataGridColumnDefSize(gridColumn("unsized"))).toBeUndefined()
  })
})

describe("getDataGridColumnDefMinSize", () => {
  it("reports the declared minimum", () => {
    expect(getDataGridColumnDefMinSize(gridColumn("bounded"))).toBe(120)
  })
})

describe("getDataGridColumnWidth", () => {
  it("pins a non resizable column to its locked width", () => {
    expect(getDataGridColumnWidth(gridColumn("locked"))).toBe(48)
  })

  it("uses the design width of a resizable column", () => {
    expect(getDataGridColumnWidth(gridColumn("bounded"))).toBe(200)
  })

  it("pins a locked column with equal bounds and no usable size to those bounds", () => {
    expect(getDataGridColumnWidth(gridColumn("pinned"))).toBe(64)
  })

  it("falls back to the column minimum when a locked column has no usable size", () => {
    expect(getDataGridColumnWidth(gridColumn("unsized"))).toBe(120)
  })
})

describe("getDataGridLayoutColumnWidth", () => {
  it("respects a persisted width below the library default when the column opts out of a minimum", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("withoutMinimum"), { withoutMinimum: 10 })).toBe(10)
    expect(getDataGridColumnDefMinSize(gridColumn("withoutMinimum"))).toBeUndefined()
  })

  it("keeps a persisted width that fits between the bounds", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("bounded", { bounded: 300 }), { bounded: 300 })).toBe(300)
  })

  it("raises a persisted width to the column minimum", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("bounded", { bounded: 40 }), { bounded: 40 })).toBe(120)
  })

  it("caps a persisted width at the column maximum", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("bounded", { bounded: 900 }), { bounded: 900 })).toBe(400)
  })

  it("lets a column with no maximum keep whatever the admin dragged it to", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("unbounded", { unbounded: 900 }), { unbounded: 900 })).toBe(900)
  })

  it("falls back to the design width when nothing was persisted", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("bounded"), {})).toBe(200)
  })

  it("ignores a persisted width that is not a finite number", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("bounded", { bounded: Number.NaN }), { bounded: Number.NaN })).toBe(200)
  })

  it("keeps the dragged width when the column declares no usable maximum", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("boundless", { boundless: 900 }), { boundless: 900 })).toBe(900)
  })

  it("still raises a dragged width to the minimum when the column declares no usable maximum", () => {
    expect(getDataGridLayoutColumnWidth(gridColumn("boundless", { boundless: 40 }), { boundless: 40 })).toBe(120)
  })
})
