import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Table, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { DataGridHeaderCell } from "~/src/presentation/components/custom/datagrid/components/data-grid-header-cell"
import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { type ColumnReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

import { DataGridHarness, HARNESS_COLUMNS, type HarnessTable, harnessColumnHelper } from "./data-grid-harness"

const selectColumn = selectionColumn(harnessColumnHelper, { all: "Select all rows", row: "Select row" })

const reorderApi = (draggedColumnId?: string): ColumnReorderApi => ({
  draggedColumnId,
  onColumnDragEnd: vi.fn<() => void>(),
  onColumnDragOver: vi.fn<(overId: string) => void>(),
  onColumnDragStart: vi.fn<(id: string) => void>(),
})

const renderHeader = (columnReorder: ColumnReorderApi, withSelection = false) => {
  const seen: { table?: HarnessTable } = {}

  const result = renderWithProviders(
    <DataGridHarness columns={withSelection ? [selectColumn, ...HARNESS_COLUMNS] : HARNESS_COLUMNS}>
      {(table) => {
        seen.table = table

        return (
          <Table>
            <TableHeader>
              <TableRow>
                {table
                  .getHeaderGroups()
                  .flatMap((group) => group.headers)
                  .map((header) => (
                    <DataGridHeaderCell key={header.id} columnReorder={columnReorder} header={header} persistenceKey="test.products" />
                  ))}
              </TableRow>
            </TableHeader>
          </Table>
        )
      }}
    </DataGridHarness>,
  )

  return { ...result, seen }
}

describe("DataGridHeaderCell", () => {
  afterEach(() => {
    cleanup()
  })

  it("offers a drag area and a resize handle for a resizable hideable column", () => {
    renderHeader(reorderApi())

    expect(screen.getByRole("group", { name: "Drag to reorder Title column" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resize Title column" })).toBeInTheDocument()
  })

  it("omits the drag area and the resize handle for a fixed width column", () => {
    renderHeader(reorderApi(), true)

    expect(screen.queryByRole("group", { name: "Drag to reorder select column" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Resize select column" })).toBeNull()
    expect(screen.getByRole("group", { name: "Drag to reorder Title column" })).toBeInTheDocument()
  })

  it("reports the column being dragged over and the end of the drag", () => {
    const columnReorder = reorderApi()
    const { container } = renderHeader(columnReorder)
    const [firstHead] = container.querySelectorAll("th")

    fireEvent.dragEnter(firstHead ?? document.body)
    fireEvent.drop(firstHead ?? document.body)

    expect(columnReorder.onColumnDragOver).toHaveBeenCalledWith("title")
    expect(columnReorder.onColumnDragEnd).toHaveBeenCalledTimes(1)
  })

  it("accepts a column dropped over a header by cancelling the default drag over", () => {
    const { container } = renderHeader(reorderApi())
    const [firstHead] = container.querySelectorAll("th")

    expect(fireEvent.dragOver(firstHead ?? document.body)).toBe(false)
  })

  it("ends the drag when the drag area is released", () => {
    const columnReorder = reorderApi()
    renderHeader(columnReorder)

    fireEvent.dragEnd(screen.getByRole("group", { name: "Drag to reorder Title column" }))

    expect(columnReorder.onColumnDragEnd).toHaveBeenCalledTimes(1)
  })

  it("starts a column drag from the drag area", () => {
    const columnReorder = reorderApi()
    renderHeader(columnReorder)

    fireEvent.dragStart(screen.getByRole("group", { name: "Drag to reorder Title column" }), {
      dataTransfer: { setData: vi.fn<(format: string, data: string) => void>() },
    })

    expect(columnReorder.onColumnDragStart).toHaveBeenCalledWith("title")
  })

  it("fades the header of the column currently being dragged", () => {
    const { container } = renderHeader(reorderApi("title"))
    const [firstHead] = container.querySelectorAll("th")

    expect(firstHead?.className).toContain("opacity-40")
  })

  it("draws the pinned boundary only after the last of two start-pinned columns", () => {
    const { seen } = renderHeader(reorderApi())

    act(() => {
      seen.table?.setColumnPinning({ end: [], start: ["title", "price"] })
    })

    const title = screen.getByRole("button", { name: "Sort by Title" }).closest("th")
    const price = screen.getByRole("button", { name: "Sort by Price" }).closest("th")
    expect(title).toHaveAttribute("data-pinned", "start")
    expect(price).toHaveAttribute("data-pinned", "start")
    expect(title).not.toHaveClass("border-r")
    expect(price).toHaveClass("border-r", "border-border/60")
  })

  it("toggles the column sorting from the header sort button", async () => {
    const { seen } = renderHeader(reorderApi())

    await userEvent.click(screen.getByRole("button", { name: "Sort by Title" }))

    expect(seen.table?.atoms.sorting.get()).toStrictEqual([{ desc: false, id: "title" }])

    await userEvent.click(screen.getByRole("button", { name: "Sort by Title" }))

    expect(seen.table?.atoms.sorting.get()).toStrictEqual([{ desc: true, id: "title" }])
  })

  it("resets the column width on a double click of the resize handle", async () => {
    const { seen } = renderHeader(reorderApi())
    seen.table?.setColumnSizing({ title: 320 })

    expect(seen.table?.getColumn("title")?.getSize()).toBe(320)

    await userEvent.dblClick(screen.getByRole("button", { name: "Resize Title column" }))

    expect(Object.keys(seen.table?.atoms.columnSizing.get() ?? {})).toStrictEqual([])
    expect(seen.table?.getColumn("title")?.getSize()).not.toBe(320)
  })
})
