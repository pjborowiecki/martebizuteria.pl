import { type ColumnResizeMode, constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { createDataGridColumnResizeHandler } from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-resize"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface Row {
  readonly title: string
}

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, Row>()

const columns = columnHelper.columns([columnHelper.accessor("title", { meta: { fillsRemainingWidth: true }, minSize: 80, size: 100 })])

const lockedColumns = columnHelper.columns([columnHelper.accessor("title", { enableResizing: false, size: 100 })])

const columnsWithoutBounds = columnHelper.columns([columnHelper.accessor("title", { meta: { fillsRemainingWidth: true }, size: 100 })])

const CONTAINER_WIDTH = 900

const HEADER_CELL_WIDTH = 240

const markup = `
  <div data-slot="data-table-container">
    <table><thead><tr><th><span data-testid="resize-handle"></span></th></tr></thead></table>
  </div>
`

const measured = (element: Element, property: "clientWidth" | "offsetWidth", value: number): void => {
  Object.defineProperty(element, property, { configurable: true, value })
}

const findHandle = (): Element => {
  const handle = document.querySelector("[data-testid='resize-handle']")
  if (handle === null) {
    throw new Error("expected the resize handle to be rendered")
  }

  return handle
}

const createGrid = (options: {
  columnResizeMode: ColumnResizeMode
  defaultColumn?: { maxSize?: number; minSize?: number }
  direction?: "ltr" | "rtl"
  fill?: boolean
  locked?: boolean
  withoutBounds?: boolean
}) => {
  const resizableColumns = options.withoutBounds === true ? columnsWithoutBounds : columns
  const table = constructTable({
    columnResizeDirection: options.direction ?? "ltr",
    columnResizeMode: options.columnResizeMode,
    columns: options.locked === true ? lockedColumns : resizableColumns,
    data: [{ title: "Ring" }],
    ...(options.defaultColumn === undefined ? {} : { defaultColumn: options.defaultColumn }),
    features,
  })
  const [header] = table.getLeafHeaders()
  if (header === undefined) {
    throw new Error("expected a leaf header for the title column")
  }
  if (options.withoutBounds === true) {
    delete header.column.columnDef.minSize
    delete header.column.columnDef.maxSize
  }
  if (options.fill === false) {
    header.column.columnDef.meta = { fillsRemainingWidth: false }
  }
  const handle = findHandle()
  const resize = createDataGridColumnResizeHandler(header)
  handle.addEventListener("mousedown", resize)
  handle.addEventListener("touchstart", resize)

  return { column: header.column, handle, resize, table }
}

const press = (handle: Element, clientX: number): void => {
  handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX }))
}

const touch = (type: string, clientXs: readonly number[]): Event =>
  Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    changedTouches: clientXs.map((clientX) => ({ clientX })),
    touches: clientXs.map((clientX) => ({ clientX })),
  })

const moveMouse = (clientX: number): void => {
  document.dispatchEvent(new MouseEvent("mousemove", { clientX }))
}

const releaseMouse = (clientX: number): void => {
  document.dispatchEvent(new MouseEvent("mouseup", { clientX }))
}

beforeEach(() => {
  document.body.innerHTML = markup
  const container = document.querySelector("[data-slot='data-table-container']")
  const cell = document.querySelector("th")
  if (container === null || cell === null) {
    throw new Error("expected the table scaffolding to be rendered")
  }
  measured(container, "clientWidth", CONTAINER_WIDTH)
  measured(cell, "offsetWidth", HEADER_CELL_WIDTH)
})

afterEach(() => {
  releaseMouse(0)
  document.dispatchEvent(touch("touchcancel", []))
  document.body.innerHTML = ""
})

describe("createDataGridColumnResizeHandler guards", () => {
  it("ignores anything that is not a mouse or touch press", () => {
    const { column, resize } = createGrid({ columnResizeMode: "onChange" })

    resize("mousedown")
    resize(undefined)
    resize(null)
    resize({})
    resize({ type: 1 })
    resize({ type: "click" })
    moveMouse(400)

    expect(column.getSize()).toBe(100)
    expect(column.getIsResizing()).toBe(false)
  })

  it("ignores a press on a column that cannot be resized", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange", locked: true })

    press(handle, 200)
    moveMouse(400)

    expect(column.getSize()).toBe(100)
    expect(column.getIsResizing()).toBe(false)
  })

  it("ignores a two-finger gesture so pinch zoom is left alone", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange" })

    handle.dispatchEvent(touch("touchstart", [200, 260]))
    document.dispatchEvent(touch("touchmove", [400]))

    expect(column.getSize()).toBe(100)
    expect(column.getIsResizing()).toBe(false)
  })
})

describe("column resize measurement fallbacks", () => {
  it("uses the table maximum for an ordinary column without its own maximum", () => {
    const { handle, table } = createGrid({
      columnResizeMode: "onChange",
      defaultColumn: { maxSize: 300 },
      fill: false,
      withoutBounds: true,
    })

    press(handle, 200)
    releaseMouse(1200)

    expect(table.atoms.columnSizing.get()).toStrictEqual({ title: 300 })
  })

  it("allows ordinary columns to grow when neither the column nor table defines a maximum", () => {
    const { handle, table } = createGrid({ columnResizeMode: "onChange", fill: false, withoutBounds: true })

    press(handle, 200)
    releaseMouse(1200)

    expect(table.atoms.columnSizing.get()).toStrictEqual({ title: 1100 })
  })

  it("uses the column design width when a programmatic event has no DOM target", () => {
    const { column, resize } = createGrid({ columnResizeMode: "onChange" })

    resize(new MouseEvent("mousedown", { clientX: 200 }))
    releaseMouse(250)

    expect(column.getSize()).toBe(150)
    expect(column.getIsResizing()).toBe(false)
  })

  it("uses the design width for a handle outside a table cell", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange" })
    document.body.replaceChildren(handle)

    press(handle, 200)
    releaseMouse(250)

    expect(column.getSize()).toBe(150)
  })

  it("uses the resolved layout width while the header has not been measured", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange" })
    const cell = handle.closest("th")
    if (cell === null) {
      throw new Error("expected a table header")
    }
    measured(cell, "offsetWidth", 0)

    press(handle, 200)
    releaseMouse(250)

    expect(column.getSize()).toBe(CONTAINER_WIDTH + 50)
  })

  it("uses a persisted fill width when neither DOM measurement nor a flex layout is available", () => {
    const { column, resize, table } = createGrid({ columnResizeMode: "onChange" })
    table.setColumnSizing({ title: 150 })

    resize(new MouseEvent("mousedown", { clientX: 200 }))
    releaseMouse(250)

    expect(column.getSize()).toBe(200)
  })

  it("reverses pointer movement in a right-to-left table", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange", direction: "rtl" })

    press(handle, 200)
    releaseMouse(250)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH - 50)
  })

  it("uses the shared minimum when neither the column nor the table provides a bound", () => {
    const { column, handle, table } = createGrid({ columnResizeMode: "onChange", withoutBounds: true })

    press(handle, 200)
    releaseMouse(-1000)

    expect(table.atoms.columnSizing.get()[column.id]).toBe(20)
  })

  it.each([
    [-1000, 60],
    [1000, 300],
  ])("uses table default bounds at pointer position %s", (clientX, width) => {
    const { column, handle, table } = createGrid({
      columnResizeMode: "onChange",
      defaultColumn: { maxSize: 300, minSize: 60 },
      withoutBounds: true,
    })

    press(handle, 200)
    releaseMouse(clientX)

    expect(table.atoms.columnSizing.get()[column.id]).toBe(width)
  })
})

describe("createDataGridColumnResizeHandler on a filling column", () => {
  it("adopts the rendered header width as the starting point", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange" })

    press(handle, 200)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH)
    expect(column.getIsResizing()).toBe(true)
  })

  it("tracks the pointer while dragging in onChange mode", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange" })

    press(handle, 200)
    moveMouse(260)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH + 60)
  })

  it("waits for the release before resizing in onEnd mode", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onEnd" })

    press(handle, 200)
    moveMouse(260)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH)

    releaseMouse(300)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH + 100)
    expect(column.getIsResizing()).toBe(false)
  })

  it("never shrinks the column below its declared minimum", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange" })

    press(handle, 200)
    moveMouse(0)

    expect(column.getSize()).toBe(80)
  })

  it("keeps the width it was dragged to on release", () => {
    const { column, handle } = createGrid({ columnResizeMode: "onChange" })

    press(handle, 200)
    moveMouse(280)
    releaseMouse(280)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH + 80)

    moveMouse(600)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH + 80)
  })

  it("keeps using the stored width once the column has been sized by hand", () => {
    const { column, handle, table } = createGrid({ columnResizeMode: "onChange" })
    table.setColumnSizing({ title: 150 })

    press(handle, 200)
    moveMouse(250)

    expect(column.getSize()).toBe(HEADER_CELL_WIDTH + 50)
  })
})
