import { constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import {
  getDataGridLayoutColumns,
  getDataGridLayoutHeaders,
  getDataGridPinOffset,
  getDataGridRightPinnedScrollPaddingPx,
  measureDataGridContainerWidth,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

interface Row {
  readonly email: string
  readonly id: string
  readonly title: string
}

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, Row>()

const columns = columnHelper.columns([
  columnHelper.display({ enableResizing: false, id: "select", maxSize: 48, minSize: 48, size: 48 }),
  columnHelper.accessor("id", { size: 120 }),
  columnHelper.accessor("title", { size: 200 }),
  columnHelper.accessor("email", { meta: { filterOnly: true }, size: 160 }),
  columnHelper.display({ enableResizing: false, id: "actions", maxSize: 64, minSize: 64, size: 64 }),
])

const createGrid = (pinning: { end?: string[]; start?: string[] } = {}) =>
  constructTable({
    columns,
    data: [{ email: "a@example.com", id: "row-1", title: "Ring" }],
    features,
    initialState: { columnPinning: { end: pinning.end ?? [], start: pinning.start ?? [] } },
  })

const columnById = (table: ReturnType<typeof createGrid>, columnId: string) => {
  const column = table.getColumn(columnId)
  if (column === undefined) {
    throw new Error(`expected a column named ${columnId}`)
  }

  return column
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getDataGridLayoutHeaders", () => {
  it("drops the filter-only column from the rendered header row", () => {
    expect(getDataGridLayoutHeaders(createGrid()).map((header) => header.column.id)).toStrictEqual(["select", "id", "title", "actions"])
  })

  it("drops a hidden column from the rendered header row", () => {
    const table = createGrid()
    columnById(table, "title").toggleVisibility(false)

    expect(getDataGridLayoutHeaders(table).map((header) => header.column.id)).toStrictEqual(["select", "id", "actions"])
  })

  it("renders no header row at all once every column is hidden", () => {
    const table = createGrid()
    table.setColumnVisibility({ actions: false, email: false, id: false, select: false, title: false })

    expect(getDataGridLayoutHeaders(table)).toStrictEqual([])
  })

  it("renders no header row for a table that reports no header groups", () => {
    const table = createGrid()
    vi.spyOn(table, "getHeaderGroups").mockReturnValue([])

    expect(getDataGridLayoutHeaders(table)).toStrictEqual([])
  })
})

describe("getDataGridLayoutColumns", () => {
  it("mirrors the rendered header row", () => {
    expect(getDataGridLayoutColumns(createGrid()).map((column) => column.id)).toStrictEqual(["select", "id", "title", "actions"])
  })

  it("lays out nothing once every column is hidden", () => {
    const table = createGrid()
    table.setColumnVisibility({ actions: false, email: false, id: false, select: false, title: false })

    expect(getDataGridLayoutColumns(table)).toStrictEqual([])
  })

  it("lays out nothing for a grid that carries only filter-only columns", () => {
    const table = constructTable({
      columns: columnHelper.columns([columnHelper.accessor("email", { meta: { filterOnly: true }, size: 160 })]),
      data: [{ email: "a@example.com", id: "row-1", title: "Ring" }],
      features,
    })

    expect(getDataGridLayoutColumns(table)).toStrictEqual([])
  })
})

describe("getDataGridPinOffset", () => {
  it("has no offset for an unpinned column", () => {
    const table = createGrid({ start: ["select"] })

    expect(
      getDataGridPinOffset({ column: columnById(table, "title"), columnSizing: {}, isPinned: false, table, tableLayout: undefined }),
    ).toBeUndefined()
  })

  it("leaves the first start-pinned column flush with the container edge", () => {
    const table = createGrid({ start: ["select"] })

    expect(
      getDataGridPinOffset({ column: columnById(table, "select"), columnSizing: {}, isPinned: "start", table, tableLayout: undefined }),
    ).toBe(0)
  })

  it("stacks a second start-pinned column behind the width of the first", () => {
    const table = createGrid({ start: ["select", "id"] })

    expect(
      getDataGridPinOffset({ column: columnById(table, "id"), columnSizing: {}, isPinned: "start", table, tableLayout: undefined }),
    ).toBe(48)
  })

  it("respects a persisted width when stacking start-pinned columns", () => {
    const table = createGrid({ start: ["select", "id"] })

    expect(
      getDataGridPinOffset({
        column: columnById(table, "title"),
        columnSizing: { id: 200 },
        isPinned: "start",
        table,
        tableLayout: undefined,
      }),
    ).toBe(248)
  })

  it("counts only the laid-out start-pinned columns for a pinned column that is not laid out itself", () => {
    const table = createGrid({ start: ["select", "email"] })

    expect(
      getDataGridPinOffset({ column: columnById(table, "email"), columnSizing: {}, isPinned: "start", table, tableLayout: undefined }),
    ).toBe(48)
  })

  it("counts only the laid-out end-pinned columns for a pinned column that is not laid out itself", () => {
    const table = createGrid({ end: ["email", "actions"] })

    expect(
      getDataGridPinOffset({ column: columnById(table, "email"), columnSizing: {}, isPinned: "end", table, tableLayout: undefined }),
    ).toBe(64)
  })

  it("leaves the last end-pinned column flush with the trailing edge", () => {
    const table = createGrid({ end: ["actions"] })

    expect(
      getDataGridPinOffset({ column: columnById(table, "actions"), columnSizing: {}, isPinned: "end", table, tableLayout: undefined }),
    ).toBe(0)
  })

  it("stacks an earlier end-pinned column in front of the columns pinned after it", () => {
    const table = createGrid({ end: ["title", "actions"] })

    expect(
      getDataGridPinOffset({ column: columnById(table, "title"), columnSizing: {}, isPinned: "end", table, tableLayout: undefined }),
    ).toBe(64)
  })

  it("adds the unused container width when the table is narrower than its viewport", () => {
    const table = createGrid({ end: ["actions"] })

    expect(
      getDataGridPinOffset({
        column: columnById(table, "actions"),
        columnSizing: {},
        isPinned: "end",
        pinLayout: { tableClientWidth: 1000, tableWidth: 600 },
        table,
        tableLayout: undefined,
      }),
    ).toBe(400)
  })

  it("never pulls an end-pinned column outwards when the table overflows its viewport", () => {
    const table = createGrid({ end: ["actions"] })

    expect(
      getDataGridPinOffset({
        column: columnById(table, "actions"),
        columnSizing: {},
        isPinned: "end",
        pinLayout: { tableClientWidth: 600, tableWidth: 1000 },
        table,
        tableLayout: undefined,
      }),
    ).toBe(0)
  })
})

describe("getDataGridRightPinnedScrollPaddingPx", () => {
  it("is zero when nothing is pinned to the trailing edge", () => {
    const table = createGrid()

    expect(getDataGridRightPinnedScrollPaddingPx(getDataGridLayoutColumns(table), {}, undefined)).toBe(0)
  })

  it("sums the widths of every end-pinned column", () => {
    const table = createGrid({ end: ["title", "actions"] })

    expect(getDataGridRightPinnedScrollPaddingPx(getDataGridLayoutColumns(table), {}, undefined)).toBe(264)
  })

  it("counts the persisted width of an end-pinned column", () => {
    const table = createGrid({ end: ["title", "actions"] })

    expect(getDataGridRightPinnedScrollPaddingPx(getDataGridLayoutColumns(table), { title: 300 }, undefined)).toBe(364)
  })
})

const renderDataTableContainer = (clientWidth: number) => {
  document.body.innerHTML = `<div data-slot="data-table-container"><table><thead><tr><th></th></tr></thead></table></div>`
  const container = document.querySelector("[data-slot='data-table-container']")
  const cell = document.querySelector("th")
  if (!(container instanceof HTMLElement) || cell === null) {
    throw new Error("expected a container and a header cell")
  }
  Object.defineProperty(container, "clientWidth", { configurable: true, value: clientWidth })

  return cell
}

describe("measureDataGridContainerWidth", () => {
  it("reads the client width of the enclosing data table container", () => {
    const cell = renderDataTableContainer(880)
    const event = new Event("mousedown")
    cell.dispatchEvent(event)

    expect(measureDataGridContainerWidth(event)).toBe(880)
  })

  it("measures nothing when the event has no element target", () => {
    expect(measureDataGridContainerWidth(new Event("mousedown"))).toBe(0)
  })

  it("measures nothing when the target sits outside a data table container", () => {
    document.body.innerHTML = "<table><thead><tr><th></th></tr></thead></table>"
    const cell = document.querySelector("th")
    if (cell === null) {
      throw new Error("expected a header cell")
    }
    const event = new Event("mousedown")
    cell.dispatchEvent(event)

    expect(measureDataGridContainerWidth(event)).toBe(0)
  })
})
