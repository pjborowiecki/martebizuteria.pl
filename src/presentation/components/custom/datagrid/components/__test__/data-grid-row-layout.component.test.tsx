import { cleanup, fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Table, TableBody } from "~/src/presentation/components/shadcn/table"

import { DataGridRow } from "~/src/presentation/components/custom/datagrid/components/data-grid-row"
import { type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

import { DataGridHarness, harnessColumnHelper } from "./data-grid-harness"

const helper = harnessColumnHelper

const COLUMNS = helper.columns([
  helper.accessor("title", { header: "Title" }),
  helper.accessor("price", { header: "Price" }),
  helper.accessor("id", { header: "Id", meta: { cellClassName: "text-right", preventRowClick: true } }),
])

const reorderApi = (): RowReorderApi => ({
  draggingId: undefined,
  enabled: true,
  onRowDragEnter: vi.fn<(overId: string) => void>(),
  onRowDragStart: vi.fn<(id: string) => void>(),
  onRowDrop: vi.fn<() => void>(),
  onRowMove: vi.fn<(id: string, direction: "down" | "up") => void>(),
})

const renderRows = ({
  pinning,
  rowReorder,
}: {
  pinning?: { end?: string[]; start?: string[] }
  rowReorder?: RowReorderApi
} = {}) =>
  renderWithProviders(
    <DataGridHarness
      columns={COLUMNS}
      options={pinning === undefined ? {} : { initialState: { columnPinning: { end: pinning.end ?? [], start: pinning.start ?? [] } } }}
    >
      {(table) => (
        <Table>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <DataGridRow key={row.id} persistenceKey="test.products" row={row} rowReorder={rowReorder} table={table} />
            ))}
          </TableBody>
        </Table>
      )}
    </DataGridHarness>,
  )

const firstRowCells = (container: HTMLElement): HTMLTableCellElement[] => [
  ...container.querySelectorAll<HTMLTableCellElement>("tbody tr:first-child td"),
]

afterEach(() => {
  cleanup()
})

describe("DataGridRow cell layout", () => {
  it("leaves unpinned cells free of the pinning attributes", () => {
    const { container } = renderRows()

    for (const cell of firstRowCells(container)) {
      expect(cell).not.toHaveAttribute("data-pinned")
      expect(cell.className).not.toContain("sticky")
    }
  })

  it("marks a left pinned cell sticky and closes it with a right border", () => {
    const { container } = renderRows({ pinning: { start: ["title"] } })
    const [first] = firstRowCells(container)

    expect(first).toHaveAttribute("data-pinned", "start")
    expect(first?.className).toContain("sticky")
    expect(first?.className).toContain("border-r")
  })

  it("marks a right pinned cell sticky and opens it with a left border", () => {
    const { container } = renderRows({ pinning: { end: ["id"] } })
    const last = firstRowCells(container).at(-1)

    expect(last).toHaveAttribute("data-pinned", "end")
    expect(last?.className).toContain("sticky")
    expect(last?.className).toContain("border-l")
  })

  it("carries the column's own cell class through", () => {
    const { container } = renderRows()
    const last = firstRowCells(container).at(-1)

    expect(last?.className).toContain("text-right")
  })

  it("flags the cells that opt out of row clicks", () => {
    const { container } = renderRows()
    const cells = firstRowCells(container)

    expect(cells[0]).not.toHaveAttribute("data-prevent-row-click")
    expect(cells.at(-1)).toHaveAttribute("data-prevent-row-click", "true")
  })

  it("stays aligned with the header by leaving an empty cell for a column the row has no cell for", () => {
    const { container } = renderWithProviders(
      <DataGridHarness columns={COLUMNS}>
        {(headerTable) => (
          <DataGridHarness columns={COLUMNS.slice(0, -1)}>
            {(rowTable) => (
              <Table>
                <TableBody>
                  {rowTable.getRowModel().rows.map((row) => (
                    <DataGridRow key={row.id} persistenceKey="test.products" row={row} rowReorder={undefined} table={headerTable} />
                  ))}
                </TableBody>
              </Table>
            )}
          </DataGridHarness>
        )}
      </DataGridHarness>,
    )

    expect(firstRowCells(container).map((cell) => cell.textContent)).toStrictEqual(["Silver ring", "200", ""])
  })
})

describe("DataGridRow drag targets", () => {
  it("accepts a drag over while reordering is on", () => {
    const { container } = renderRows({ rowReorder: reorderApi() })
    const row = container.querySelector("tbody tr")
    if (row === null) {
      throw new Error("No row was rendered")
    }

    expect(fireEvent.dragOver(row)).toBe(false)
  })

  it("refuses a drag over while reordering is off", () => {
    const { container } = renderRows()
    const row = container.querySelector("tbody tr")
    if (row === null) {
      throw new Error("No row was rendered")
    }

    expect(fireEvent.dragOver(row)).toBe(true)
  })
})
