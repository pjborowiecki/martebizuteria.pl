import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { afterEach, describe, expect, it } from "vite-plus/test"

import {
  applyDataGridColumnSizingCssVars,
  buildDataGridColumnWidthStyle,
  clearDataGridColumnSizingCssVars,
  dataGridColumnWidthCssVar,
  dataGridPersistenceKeySlug,
  syncDataGridColumnSizingCssVars,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-width"
import { type DataGridTableLayout } from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface Row {
  readonly fill: string
  readonly fillWithoutMinimum: string
  readonly locked: string
  readonly slack: string
  readonly title: string
  readonly titleWithoutMinimum: string
}

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, Row>()

const columns = columnHelper.columns([
  columnHelper.accessor("locked", { enableResizing: false, maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("title", { maxSize: 400, minSize: 120, size: 200 }),
  columnHelper.accessor("fill", { meta: { fillsRemainingWidth: true }, minSize: 200, size: 520 }),
  columnHelper.accessor("fillWithoutMinimum", { meta: { fillsRemainingWidth: true }, minSize: Number.NaN, size: 520 }),
  columnHelper.accessor("slack", { meta: { absorbsTrailingSlack: true }, minSize: 100, size: 320 }),
  columnHelper.accessor("titleWithoutMinimum", { minSize: Number.NaN, size: 200 }),
])

const gridColumn = (columnId: string) => {
  const table = constructTable({ columns, data: [], features })
  const column = table.getColumn(columnId)
  if (column === undefined) {
    throw new Error(`expected a column named ${columnId}`)
  }

  return column
}

const layout: DataGridTableLayout = {
  fillColumnIsUserSized: false,
  fillColumnWidth: 520,
  slackAbsorberColumnWidth: 320,
  tableWidth: 1088,
}

const readCssVar = (persistenceKey: string, columnId: string) =>
  document.documentElement.style.getPropertyValue(dataGridColumnWidthCssVar(persistenceKey, columnId))

describe("dataGridPersistenceKeySlug", () => {
  it("replaces every dot and colon so the value is usable in a css custom property", () => {
    expect(dataGridPersistenceKeySlug("admin.catalog:products")).toBe("admin-catalog-products")
  })

  it("leaves a key with no separators untouched", () => {
    expect(dataGridPersistenceKeySlug("customers")).toBe("customers")
  })
})

describe("dataGridColumnWidthCssVar", () => {
  it("namespaces the custom property by grid and column", () => {
    expect(dataGridColumnWidthCssVar("admin.customers", "title")).toBe("--marte-dg-admin-customers-title")
  })
})

describe("syncDataGridColumnSizingCssVars", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style")
  })

  it("publishes each persisted width in pixels", () => {
    syncDataGridColumnSizingCssVars({ columnIds: ["title"], persistenceKey: "admin.customers", sizing: { title: 240 } })

    expect(readCssVar("admin.customers", "title")).toBe("240px")
  })

  it("caps a persisted width at the column maximum", () => {
    syncDataGridColumnSizingCssVars({
      columnIds: ["title"],
      columnMaxSizes: { title: 400 },
      persistenceKey: "admin.customers",
      sizing: { title: 900 },
    })

    expect(readCssVar("admin.customers", "title")).toBe("400px")
  })

  it("leaves a width below the maximum alone", () => {
    syncDataGridColumnSizingCssVars({
      columnIds: ["title"],
      columnMaxSizes: { title: 400 },
      persistenceKey: "admin.customers",
      sizing: { title: 240 },
    })

    expect(readCssVar("admin.customers", "title")).toBe("240px")
  })

  it("clears a column that no longer has a persisted width", () => {
    applyDataGridColumnSizingCssVars("admin.customers", { title: 240 })
    syncDataGridColumnSizingCssVars({ columnIds: ["title"], persistenceKey: "admin.customers", sizing: {} })

    expect(readCssVar("admin.customers", "title")).toBe("")
  })

  it.each([
    ["zero", 0],
    ["negative", -10],
    ["infinite", Number.POSITIVE_INFINITY],
    ["not a number", Number.NaN],
  ])("refuses to publish a %s width", (_label, size) => {
    syncDataGridColumnSizingCssVars({ columnIds: ["title"], persistenceKey: "admin.customers", sizing: { title: size } })

    expect(readCssVar("admin.customers", "title")).toBe("")
  })

  it("keeps grids with different persistence keys apart", () => {
    applyDataGridColumnSizingCssVars("admin.customers", { title: 240 })
    applyDataGridColumnSizingCssVars("admin.orders", { title: 320 })

    expect(readCssVar("admin.customers", "title")).toBe("240px")
    expect(readCssVar("admin.orders", "title")).toBe("320px")
  })
})

describe("clearDataGridColumnSizingCssVars", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style")
  })

  it("removes only the listed columns of the given grid", () => {
    applyDataGridColumnSizingCssVars("admin.customers", { locked: 48, title: 240 })
    clearDataGridColumnSizingCssVars("admin.customers", ["title"])

    expect(readCssVar("admin.customers", "title")).toBe("")
    expect(readCssVar("admin.customers", "locked")).toBe("48px")
  })
})

describe("columns without a minimum width", () => {
  it("lets an unmeasured fill column grow without imposing a minimum", () => {
    const style = buildDataGridColumnWidthStyle({ column: gridColumn("fillWithoutMinimum"), widthPx: 520 })

    expect(style).toStrictEqual({ boxSizing: "border-box", width: "auto" })
  })

  it("uses the persisted CSS width directly when a resizable column has no minimum", () => {
    const style = buildDataGridColumnWidthStyle({
      column: gridColumn("titleWithoutMinimum"),
      persistenceKey: "admin.customers",
      widthPx: 200,
    })

    expect(style).toStrictEqual({
      boxSizing: "border-box",
      maxWidth: "var(--marte-dg-admin-customers-titleWithoutMinimum, 200px)",
      minWidth: "var(--marte-dg-admin-customers-titleWithoutMinimum, 200px)",
      width: "var(--marte-dg-admin-customers-titleWithoutMinimum, 200px)",
    })
  })
})

describe("buildDataGridColumnWidthStyle", () => {
  it("lets an unmeasured fill column grow while holding its minimum", () => {
    expect(buildDataGridColumnWidthStyle({ column: gridColumn("fill"), persistenceKey: "admin.customers", widthPx: 520 })).toStrictEqual({
      boxSizing: "border-box",
      minWidth: "200px",
      width: "auto",
    })
  })

  it("pins a fill column to the resolved layout width once the layout is known", () => {
    expect(
      buildDataGridColumnWidthStyle({ column: gridColumn("fill"), layout, persistenceKey: "admin.customers", widthPx: 520 }),
    ).toStrictEqual({ boxSizing: "border-box", maxWidth: "520px", minWidth: "520px", width: "520px" })
  })

  it("pins a non resizable column to the measured width", () => {
    expect(buildDataGridColumnWidthStyle({ column: gridColumn("locked"), persistenceKey: "admin.customers", widthPx: 48 })).toStrictEqual({
      boxSizing: "border-box",
      maxWidth: "48px",
      minWidth: "48px",
      width: "48px",
    })
  })

  it("drives a resizable column from its css custom property with the column minimum as a floor", () => {
    expect(buildDataGridColumnWidthStyle({ column: gridColumn("title"), persistenceKey: "admin.customers", widthPx: 200 })).toStrictEqual({
      boxSizing: "border-box",
      maxWidth: "max(var(--marte-dg-admin-customers-title, 200px), 120px)",
      minWidth: "120px",
      width: "max(var(--marte-dg-admin-customers-title, 200px), 120px)",
    })
  })

  it("pins a resizable column to the measured width when no grid persists its size", () => {
    expect(buildDataGridColumnWidthStyle({ column: gridColumn("title"), widthPx: 200 })).toStrictEqual({
      boxSizing: "border-box",
      maxWidth: "200px",
      minWidth: "200px",
      width: "200px",
    })
  })

  it("lets the slack absorber follow its own persisted width while the fill column flexes", () => {
    expect(
      buildDataGridColumnWidthStyle({ column: gridColumn("slack"), layout, persistenceKey: "admin.customers", widthPx: 320 }),
    ).toStrictEqual({
      boxSizing: "border-box",
      maxWidth: "max(var(--marte-dg-admin-customers-slack, 320px), 100px)",
      minWidth: "100px",
      width: "max(var(--marte-dg-admin-customers-slack, 320px), 100px)",
    })
  })

  it("pins the slack absorber once the fill column has a user chosen width", () => {
    expect(
      buildDataGridColumnWidthStyle({
        column: gridColumn("slack"),
        layout: { ...layout, fillColumnIsUserSized: true },
        persistenceKey: "admin.customers",
        widthPx: 260,
      }),
    ).toStrictEqual({ boxSizing: "border-box", maxWidth: "260px", minWidth: "260px", width: "260px" })
  })
})
