import { describe, expect, it } from "vite-plus/test"

import {
  DATAGRID_UTILITY_COLUMN_IDS,
  buildDataGridColumnMaxSizes,
  buildDataGridColumnMinSizes,
  clampDataGridColumnSizing,
  clampDataGridColumnSizingToMaxes,
  clampDataGridColumnSizingToMins,
  fixedDataGridColumnWidth,
  getDataGridColumnIds,
  getNonResizableColumnIds,
  moveItemBefore,
  omitNonResizableColumnSizing,
  reorderColumnOrder,
  sameOrder,
  swapItems,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

describe("fixedDataGridColumnWidth", () => {
  it("pins the minimum, maximum and default size together and disables resizing", () => {
    expect(fixedDataGridColumnWidth(48)).toStrictEqual({ enableResizing: false, maxSize: 48, minSize: 48, size: 48 })
  })
})

describe("getNonResizableColumnIds", () => {
  it("collects columns that opted out of resizing", () => {
    expect(getNonResizableColumnIds([{ enableResizing: false, id: "select" }, { id: "title" }])).toStrictEqual(["select"])
  })

  it("collects the column that absorbs trailing slack", () => {
    expect(getNonResizableColumnIds([{ id: "target", meta: { absorbsTrailingSlack: true } }])).toStrictEqual(["target"])
  })

  it("falls back to the accessor key when no explicit id is set", () => {
    expect(getNonResizableColumnIds([{ accessorKey: "title", enableResizing: false }])).toStrictEqual(["title"])
  })

  it("skips a column that has neither an id nor an accessor key", () => {
    expect(getNonResizableColumnIds([{ accessorKey: undefined, enableResizing: false, header: "Untitled" }])).toStrictEqual([])
  })
})

describe("buildDataGridColumnMinSizes", () => {
  it("records the declared minimum of each resizable column", () => {
    expect(buildDataGridColumnMinSizes([{ id: "title", minSize: 120 }, { id: "status" }])).toStrictEqual({ title: 120 })
  })

  it("skips non-resizable columns so persisted widths cannot widen them", () => {
    expect(buildDataGridColumnMinSizes([{ enableResizing: false, id: "select", minSize: 48 }])).toStrictEqual({})
  })

  it("skips a non-finite minimum", () => {
    expect(buildDataGridColumnMinSizes([{ id: "title", minSize: Number.NaN }])).toStrictEqual({})
  })
})

describe("buildDataGridColumnMaxSizes", () => {
  it("uses the declared maximum when there is one", () => {
    expect(buildDataGridColumnMaxSizes([{ id: "title", maxSize: 300 }])).toStrictEqual({ title: 300 })
  })

  it("derives a maximum from the default size when none is declared", () => {
    expect(buildDataGridColumnMaxSizes([{ id: "title", size: 200 }])).toStrictEqual({ title: 500 })
  })

  it("never derives a maximum below the declared minimum", () => {
    expect(buildDataGridColumnMaxSizes([{ id: "title", minSize: 600, size: 100 }])).toStrictEqual({ title: 600 })
  })

  it("caps the derived maximum at the shared ceiling", () => {
    expect(buildDataGridColumnMaxSizes([{ id: "target", size: 1000 }])).toStrictEqual({ target: 720 })
  })

  it("falls back to the shared ceiling for a column with no sizing at all", () => {
    expect(buildDataGridColumnMaxSizes([{ id: "title" }])).toStrictEqual({ title: 720 })
  })

  it("skips non-resizable columns", () => {
    expect(buildDataGridColumnMaxSizes([{ enableResizing: false, id: "select", size: 48 }])).toStrictEqual({})
  })

  it("omits unidentified display columns and ignores unusable sizing declarations", () => {
    expect(
      buildDataGridColumnMaxSizes([
        { header: "Anonymous", size: 200 },
        { id: "title", maxSize: Number.NaN, minSize: Number.NaN, size: 100 },
        { id: "status", maxSize: Number.POSITIVE_INFINITY, size: Number.NaN },
      ]),
    ).toStrictEqual({ status: 720, title: 250 })
  })
})

describe("clamping persisted column sizing", () => {
  it("raises a saved width that is under the column minimum", () => {
    expect(clampDataGridColumnSizingToMins({ title: 80 }, { title: 120 })).toStrictEqual({ title: 120 })
  })

  it("leaves a saved width at or above the minimum alone", () => {
    expect(clampDataGridColumnSizingToMins({ title: 200 }, { title: 120 })).toStrictEqual({ title: 200 })
  })

  it("ignores a minimum for a column with no saved width", () => {
    expect(clampDataGridColumnSizingToMins({}, { title: 120 })).toStrictEqual({})
  })

  it("lowers a saved width that is over the column maximum", () => {
    expect(clampDataGridColumnSizingToMaxes({ title: 900 }, { title: 300 })).toStrictEqual({ title: 300 })
  })

  it("applies the shared ceiling to a column with no declared maximum", () => {
    expect(clampDataGridColumnSizingToMaxes({ title: 900 })).toStrictEqual({ title: 720 })
  })

  it("honours an explicit fallback ceiling", () => {
    expect(clampDataGridColumnSizingToMaxes({ title: 900 }, {}, 400)).toStrictEqual({ title: 400 })
  })

  it("lets the maximum win when the minimum and maximum conflict", () => {
    expect(clampDataGridColumnSizing({ title: 80 }, { title: 500 }, { title: 300 })).toStrictEqual({ title: 300 })
  })

  it("leaves the caller's state untouched", () => {
    const sizing = { title: 80 }
    clampDataGridColumnSizing(sizing, { title: 120 })

    expect(sizing).toStrictEqual({ title: 80 })
  })

  it("does not convert a non-finite width into a persisted finite width", () => {
    const sizing = { price: Number.POSITIVE_INFINITY, title: Number.NaN }

    expect(clampDataGridColumnSizing(sizing, { price: 100, title: 100 }, { price: 300, title: 300 })).toStrictEqual(sizing)
  })
})

describe("omitNonResizableColumnSizing", () => {
  it("drops the widths of columns that must not resize", () => {
    expect(omitNonResizableColumnSizing({ select: 400, title: 200 }, ["select"])).toStrictEqual({ title: 200 })
  })

  it("keeps everything when nothing is locked", () => {
    expect(omitNonResizableColumnSizing({ title: 200 }, [])).toStrictEqual({ title: 200 })
  })

  it("names the shared utility columns that never resize", () => {
    expect([...DATAGRID_UTILITY_COLUMN_IDS]).toStrictEqual(["actions", "drag", "image", "select"])
  })
})

describe("getDataGridColumnIds", () => {
  it("reads the declaration order, preferring an explicit id", () => {
    expect(getDataGridColumnIds([{ id: "select" }, { accessorKey: "title" }, { accessorKey: "price", id: "minPrice" }])).toStrictEqual([
      "select",
      "title",
      "minPrice",
    ])
  })

  it("skips a column that identifies itself with neither", () => {
    expect(getDataGridColumnIds([{}, { accessorKey: Symbol("title") }])).toStrictEqual([])
  })
})

describe("reorderColumnOrder", () => {
  const order = ["a", "b", "c", "d"]

  it("moves a column into the slot held by the target", () => {
    expect(reorderColumnOrder(order, "d", "b")).toStrictEqual(["a", "d", "b", "c"])
  })

  it("moves a column forwards", () => {
    expect(reorderColumnOrder(order, "a", "c")).toStrictEqual(["b", "c", "a", "d"])
  })

  it("returns a copy when the column is dropped on itself", () => {
    const result = reorderColumnOrder(order, "b", "b")

    expect(result).toStrictEqual(order)
    expect(result).not.toBe(order)
  })

  it.each([
    ["ghost", "b"],
    ["b", "ghost"],
  ])("returns a copy when %s or %s is not in the order", (draggedId, overId) => {
    expect(reorderColumnOrder(order, draggedId, overId)).toStrictEqual(order)
  })
})

describe("moveItemBefore", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }]

  it("moves the dragged item to the target position", () => {
    expect(moveItemBefore(list, "c", "a").map((item) => item.id)).toStrictEqual(["c", "a", "b"])
  })

  it("returns a copy when the item is dropped on itself", () => {
    expect(moveItemBefore(list, "b", "b").map((item) => item.id)).toStrictEqual(["a", "b", "c"])
  })

  it.each([
    ["ghost", "a"],
    ["a", "ghost"],
  ])("returns a copy when %s or %s is missing", (draggingId, overId) => {
    expect(moveItemBefore(list, draggingId, overId).map((item) => item.id)).toStrictEqual(["a", "b", "c"])
  })

  it("leaves the caller's list untouched", () => {
    moveItemBefore(list, "c", "a")

    expect(list.map((item) => item.id)).toStrictEqual(["a", "b", "c"])
  })
})

describe("swapItems", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }]

  it("swaps the two positions", () => {
    expect(swapItems(list, 0, 2).map((item) => item.id)).toStrictEqual(["c", "b", "a"])
  })

  it.each([
    [0, 5],
    [-1, 0],
  ])("returns a copy when the pair %i and %i is out of range", (index, target) => {
    expect(swapItems(list, index, target).map((item) => item.id)).toStrictEqual(["a", "b", "c"])
  })

  it("is a no-op when both indexes are the same", () => {
    expect(swapItems(list, 1, 1).map((item) => item.id)).toStrictEqual(["a", "b", "c"])
  })
})

describe("sameOrder", () => {
  it("compares ids positionally", () => {
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true)
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false)
    expect(sameOrder(["a"], ["a", "b"])).toBe(false)
    expect(sameOrder([], [])).toBe(true)
  })
})
