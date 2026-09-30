import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Table, TableBody } from "~/src/presentation/components/shadcn/table"

import { DataGridRow } from "~/src/presentation/components/custom/datagrid/components/data-grid-row"
import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { suppressNextDataGridRowClick } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

import { DataGridHarness, HARNESS_COLUMNS, type HarnessRow, harnessColumnHelper } from "./data-grid-harness"

const selectColumn = selectionColumn(harnessColumnHelper, { all: "Select all rows", row: "Select row" })

const reorderApi = (draggingId?: string): RowReorderApi => ({
  draggingId,
  enabled: true,
  onRowDragEnter: vi.fn<(overId: string) => void>(),
  onRowDragStart: vi.fn<(id: string) => void>(),
  onRowDrop: vi.fn<() => void>(),
  onRowMove: vi.fn<(id: string, direction: "up" | "down") => void>(),
})

const renderRows = ({
  onRowClick,
  onRowPointerEnter,
  rowReorder,
  withSelection = false,
}: {
  onRowClick?: (row: HarnessRow) => void
  onRowPointerEnter?: (row: HarnessRow) => void
  rowReorder?: RowReorderApi
  withSelection?: boolean
} = {}) =>
  renderWithProviders(
    <DataGridHarness columns={withSelection ? [selectColumn, ...HARNESS_COLUMNS] : HARNESS_COLUMNS}>
      {(table) => (
        <Table>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <DataGridRow
                key={row.id}
                onRowClick={onRowClick}
                onRowPointerEnter={onRowPointerEnter}
                persistenceKey="test.products"
                row={row}
                rowReorder={rowReorder}
                table={table}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </DataGridHarness>,
  )

describe("DataGridRow", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders one cell per visible column", () => {
    const { container } = renderRows()

    expect(container.querySelectorAll("tbody tr")).toHaveLength(3)
    expect(container.querySelectorAll("tbody tr:first-child td")).toHaveLength(2)
    expect(screen.getByText("Silver ring")).toBeInTheDocument()
  })

  it("stays unclickable and unhoverable without handlers", () => {
    const { container } = renderRows()
    const row = container.querySelector("tbody tr")

    expect(row?.className).not.toContain("cursor-pointer")
    expect(row).not.toHaveAttribute("data-state")
  })

  it("reports the clicked row original to the click handler", async () => {
    const onRowClick = vi.fn<(row: HarnessRow) => void>()
    renderRows({ onRowClick })

    await userEvent.click(screen.getByText("Gold ring"))

    expect(onRowClick).toHaveBeenCalledWith({ id: "gold-ring", price: 400, title: "Gold ring" })
  })

  it("reports the hovered row original to the pointer enter handler", () => {
    const onRowPointerEnter = vi.fn<(row: HarnessRow) => void>()
    const { container } = renderRows({ onRowPointerEnter })
    const row = container.querySelector("tbody tr")

    fireEvent.pointerEnter(row ?? document.body)

    expect(onRowPointerEnter).toHaveBeenCalledWith({ id: "silver-ring", price: 200, title: "Silver ring" })
  })

  it("ignores a click inside a cell that opts out of row clicks", async () => {
    const onRowClick = vi.fn<(row: HarnessRow) => void>()
    renderRows({ onRowClick, withSelection: true })

    const [firstCheckbox] = screen.getAllByRole("checkbox", { name: "Select row" })
    await userEvent.click(firstCheckbox ?? document.body)

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it("ignores a click while row clicks are suppressed", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000)
    const onRowClick = vi.fn<(row: HarnessRow) => void>()
    renderRows({ onRowClick })
    suppressNextDataGridRowClick()

    await userEvent.click(screen.getByText("Gold ring"))

    expect(onRowClick).not.toHaveBeenCalled()

    clock.mockReturnValue(1300)
    await userEvent.click(screen.getByText("Gold ring"))

    expect(onRowClick).toHaveBeenCalledOnce()
    expect(onRowClick).toHaveBeenCalledWith({ id: "gold-ring", price: 400, title: "Gold ring" })
  })

  it("marks the dragged row and reports drag enter and drop while reordering", () => {
    const rowReorder = reorderApi("gold-ring")
    const { container } = renderRows({ rowReorder })
    const rows = [...container.querySelectorAll("tbody tr")]

    expect(rows[1]).toHaveAttribute("data-dragging", "true")
    expect(rows[1]?.className).toContain("opacity-40")
    expect(rows[0]).not.toHaveAttribute("data-dragging")

    fireEvent.dragEnter(rows[0] ?? document.body)
    fireEvent.drop(rows[0] ?? document.body)

    expect(rowReorder.onRowDragEnter).toHaveBeenCalledWith("silver-ring")
    expect(rowReorder.onRowDrop).toHaveBeenCalledTimes(1)
  })

  it("ignores drag events when reordering is switched off", () => {
    const rowReorder = { ...reorderApi(), enabled: false }
    const { container } = renderRows({ rowReorder })
    const row = container.querySelector("tbody tr")

    fireEvent.dragEnter(row ?? document.body)
    fireEvent.drop(row ?? document.body)

    expect(rowReorder.onRowDragEnter).not.toHaveBeenCalled()
    expect(rowReorder.onRowDrop).not.toHaveBeenCalled()
  })

  it("marks a selected row for styling", async () => {
    const { container } = renderRows({ withSelection: true })

    const [firstCheckbox] = screen.getAllByRole("checkbox", { name: "Select row" })
    await userEvent.click(firstCheckbox ?? document.body)

    expect(container.querySelector("tbody tr")).toHaveAttribute("data-state", "selected")
  })
})
