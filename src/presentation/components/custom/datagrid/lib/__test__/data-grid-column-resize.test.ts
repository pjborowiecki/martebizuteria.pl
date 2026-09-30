import { type ColumnResizeMode, constructTable, createColumnHelper, tableFeatures } from "@tanstack/react-table"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createDataGridColumnResizeHandler } from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-resize"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

const features: DataGridFeatures = tableFeatures({ ...dataGridFeatures, coreReactivityFeature: storeReactivityBindings() })

const columnHelper = createColumnHelper<typeof features, { title: string }>()

const columns = columnHelper.columns([columnHelper.accessor("title", { size: 100 })])

const createGrid = (columnResizeMode: ColumnResizeMode) => {
  const table = constructTable({ columnResizeMode, columns, data: [{ title: "Ring" }], features })
  const [header] = table.getLeafHeaders()
  if (header === undefined) {
    throw new Error("expected a leaf header for the title column")
  }

  return { column: header.column, resize: createDataGridColumnResizeHandler(header) }
}

const touchEvent = (
  type: string,
  touches: { clientX: number }[],
  { changedTouches = [], cancelable = true }: { changedTouches?: { clientX: number }[]; cancelable?: boolean } = {},
) => Object.assign(new Event(type, { cancelable }), { changedTouches, touches })

const ElementStub = vi.fn()

describe("column resize pointer lifecycle", () => {
  let document = new EventTarget()

  beforeEach(() => {
    document = new EventTarget()
    vi.stubGlobal("document", document)
    vi.stubGlobal("Element", ElementStub)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(["onChange", "onEnd"] as const)("keeps the released touch position in %s mode", (mode) => {
    const { column, resize } = createGrid(mode)
    resize(touchEvent("touchstart", [{ clientX: 100 }]))
    document.dispatchEvent(touchEvent("touchmove", [{ clientX: 140 }]))
    document.dispatchEvent(touchEvent("touchend", [], { changedTouches: [{ clientX: 150 }] }))

    expect(column.getSize()).toBe(150)
    expect(column.getIsResizing()).toBe(false)

    document.dispatchEvent(touchEvent("touchmove", [{ clientX: 200 }]))
    expect(column.getSize()).toBe(150)
  })

  it("finishes a cancelled touch at the last known position and removes its listeners", () => {
    const { column, resize } = createGrid("onEnd")
    resize(touchEvent("touchstart", [{ clientX: 100 }]))
    document.dispatchEvent(touchEvent("touchmove", [{ clientX: 140 }]))
    document.dispatchEvent(touchEvent("touchcancel", []))

    expect(column.getSize()).toBe(140)
    expect(column.getIsResizing()).toBe(false)

    document.dispatchEvent(touchEvent("touchend", [], { changedTouches: [{ clientX: 200 }] }))
    document.dispatchEvent(touchEvent("touchmove", [{ clientX: 220 }]))
    expect(column.getSize()).toBe(140)
  })

  it("retains the last pointer position when a touch move or cancellation carries no touches", () => {
    const { column, resize } = createGrid("onChange")
    resize(touchEvent("touchstart", [{ clientX: 100 }]))
    document.dispatchEvent(touchEvent("touchmove", [{ clientX: 140 }]))
    document.dispatchEvent(touchEvent("touchmove", []))
    document.dispatchEvent(touchEvent("touchcancel", []))

    expect(column.getSize()).toBe(140)
    expect(column.getIsResizing()).toBe(false)
  })

  it("handles non-cancelable touch events without trying to prevent browser defaults", () => {
    const { column, resize } = createGrid("onChange")
    const move = touchEvent("touchmove", [{ clientX: 140 }], { cancelable: false })
    const end = touchEvent("touchend", [], { cancelable: false, changedTouches: [{ clientX: 150 }] })
    const preventMove = vi.spyOn(move, "preventDefault")
    const preventEnd = vi.spyOn(end, "preventDefault")
    resize(touchEvent("touchstart", [{ clientX: 100 }]))

    document.dispatchEvent(move)
    document.dispatchEvent(end)

    expect(column.getSize()).toBe(150)
    expect(preventMove).not.toHaveBeenCalled()
    expect(preventEnd).not.toHaveBeenCalled()
    expect(column.getIsResizing()).toBe(false)
  })

  it("avoids invalid widths when the initial touch coordinates are unavailable", () => {
    const { column, resize } = createGrid("onEnd")
    resize(touchEvent("touchstart", []))
    document.dispatchEvent(touchEvent("touchend", []))

    expect(column.getSize()).toBe(100)
    expect(column.getIsResizing()).toBe(false)
  })

  it("preserves mouse resizing and removes listeners after release", () => {
    const { column, resize } = createGrid("onChange")
    resize(Object.assign(new Event("mousedown"), { clientX: 100 }))
    document.dispatchEvent(Object.assign(new Event("mousemove"), { clientX: 140 }))
    expect(column.getSize()).toBe(140)

    document.dispatchEvent(Object.assign(new Event("mouseup"), { clientX: 150 }))
    expect(column.getSize()).toBe(150)
    expect(column.getIsResizing()).toBe(false)

    document.dispatchEvent(Object.assign(new Event("mousemove"), { clientX: 200 }))
    expect(column.getSize()).toBe(150)
  })
})
