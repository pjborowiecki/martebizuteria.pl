import { act, cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridTable } from "~/src/presentation/components/custom/datagrid/components/data-grid-table"
import { type ColumnReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

import { DataGridHarness, HARNESS_ROWS } from "./data-grid-harness"

const observed: { elements: Element[]; notify: (() => void)[] } = { elements: [], notify: [] }

class RecordingResizeObserver {
  private readonly onResize: () => void

  constructor(onResize: () => void) {
    this.onResize = onResize
  }

  disconnect(): void {
    return undefined
  }

  observe(element: Element): void {
    observed.elements.push(element)
    observed.notify.push(this.onResize)
  }

  unobserve(): void {
    return undefined
  }
}

vi.stubGlobal("ResizeObserver", RecordingResizeObserver)

const columnReorder: ColumnReorderApi = {
  draggedColumnId: undefined,
  onColumnDragEnd: vi.fn<() => void>(),
  onColumnDragOver: vi.fn<(overId: string) => void>(),
  onColumnDragStart: vi.fn<(id: string) => void>(),
}

const renderTable = (pinnedEnd: readonly string[] = []) =>
  renderWithProviders(
    <DataGridHarness data={HARNESS_ROWS} options={{ initialState: { columnPinning: { end: [...pinnedEnd], start: [] } } }}>
      {(table) => (
        <DataGridTable
          columnReorder={columnReorder}
          isLoading={false}
          persistenceKey="test.products"
          rowReorder={undefined}
          table={table}
        />
      )}
    </DataGridHarness>,
  )

const grid = (): HTMLElement => {
  const table = screen.getByRole("table")
  if (!(table instanceof HTMLTableElement)) {
    throw new Error("expected the grid to render a table element")
  }

  return table
}

const scrollContainer = (): HTMLElement => {
  const container = document.querySelector("[data-slot='data-table-container']")
  if (!(container instanceof HTMLElement)) {
    throw new Error("expected the grid to render a scroll container")
  }

  return container
}

const reportContainerWidth = (widthPx: number): void => {
  const container = scrollContainer()
  Object.defineProperty(container, "clientWidth", { configurable: true, value: widthPx })
  act(() => {
    for (const notify of observed.notify) {
      notify()
    }
  })
}

beforeEach(() => {
  observed.elements = []
  observed.notify = []
})

afterEach(() => {
  cleanup()
})

describe("DataGridTable measurement", () => {
  it("watches its own scroll container for size changes", () => {
    renderTable()

    expect(observed.elements).toStrictEqual([scrollContainer()])
  })

  it("stretches the table to 100% until the container has been measured", () => {
    renderTable()

    expect(grid().style.width).toBe("100%")
  })

  it("lays the table out across the width the container reported", () => {
    renderTable()

    reportContainerWidth(900)

    expect(grid().style.width).toBe("900px")
  })

  it("keeps the columns at their design widths and scrolls when the container is narrower", () => {
    renderTable()

    reportContainerWidth(200)

    expect(grid().style.width).toBe("300px")
    expect(grid().style.minWidth).toBe("300px")
  })

  it("re-lays the table out when the container is resized again", () => {
    renderTable()

    reportContainerWidth(900)
    reportContainerWidth(1200)

    expect(grid().style.width).toBe("1200px")
  })
})

describe("DataGridTable pinned columns", () => {
  it("reserves no scroll padding while nothing is pinned to the trailing edge", () => {
    renderTable()

    expect(scrollContainer().style.scrollPaddingInlineEnd).toBe("")
  })

  it("keeps a scrolled-to column clear of the pinned trailing column", () => {
    renderTable(["price"])

    expect(scrollContainer().style.scrollPaddingInlineEnd).toBe("150px")
  })
})
