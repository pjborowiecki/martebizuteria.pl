import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Table, TableBody } from "~/src/presentation/components/shadcn/table"

import { DataGridSkeleton } from "~/src/presentation/components/custom/datagrid/components/data-grid-skeleton"
import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { getDataGridLayoutColumns } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

import { DataGridHarness, HARNESS_COLUMNS, harnessColumnHelper } from "./data-grid-harness"

const selectColumn = selectionColumn(harnessColumnHelper, { all: "Select all rows", row: "Select row" })

const renderSkeleton = ({
  isPlaceholderBody = false,
  pinned = false,
  rowCount = 2,
}: {
  isPlaceholderBody?: boolean
  pinned?: boolean
  rowCount?: number
} = {}) =>
  renderWithProviders(
    <DataGridHarness
      columns={[selectColumn, ...HARNESS_COLUMNS]}
      options={pinned ? { initialState: { columnPinning: { end: ["price"], start: ["select"] } } } : {}}
    >
      {(table) => (
        <Table>
          <TableBody>
            <DataGridSkeleton
              columns={getDataGridLayoutColumns(table)}
              isPlaceholderBody={isPlaceholderBody}
              persistenceKey="test.products"
              rowCount={rowCount}
              table={table}
            />
          </TableBody>
        </Table>
      )}
    </DataGridHarness>,
  )

describe("DataGridSkeleton", () => {
  afterEach(() => {
    cleanup()
  })

  it("draws the requested number of rows with one cell per column", () => {
    const { container } = renderSkeleton({ rowCount: 3 })

    expect(container.querySelectorAll("tbody tr")).toHaveLength(3)
    expect(container.querySelectorAll("tbody tr:first-child td")).toHaveLength(3)
  })

  it("uses the skeleton variant each column declares", () => {
    const { container } = renderSkeleton({ rowCount: 1 })
    const cells = [...container.querySelectorAll("tbody td")]

    expect(cells[0]?.querySelector('[data-slot="skeleton"]')?.className).toContain("size-4")
    expect(cells[1]?.querySelector('[data-slot="skeleton"]')?.className).toContain("max-w-[80%]")
  })

  it("keeps the rows borderless while standing in for an empty body", () => {
    const { container } = renderSkeleton({ isPlaceholderBody: true, rowCount: 1 })

    expect(container.querySelector("tbody tr")?.className).toContain("border-b-0")
    expect(container.querySelector("tbody td")?.className).toContain("border-b-0")
  })

  it("keeps the rows bordered while standing in for known rows", () => {
    const { container } = renderSkeleton({ rowCount: 1 })

    expect(container.querySelector("tbody tr")?.className).not.toContain("border-b-0")
  })

  it("marks pinned skeleton cells sticky with their divider borders", () => {
    const { container } = renderSkeleton({ pinned: true, rowCount: 1 })
    const cells = [...container.querySelectorAll<HTMLTableCellElement>("tbody td")]
    const start = cells.find((cell) => cell.dataset["pinned"] === "start")
    const end = cells.find((cell) => cell.dataset["pinned"] === "end")

    expect(start?.className).toContain("sticky")
    expect(start?.className).toContain("border-r")
    expect(end?.className).toContain("sticky")
    expect(end?.className).toContain("border-l")
  })

  it("leaves unpinned skeleton cells unmarked", () => {
    const { container } = renderSkeleton({ rowCount: 1 })

    for (const cell of container.querySelectorAll("tbody td")) {
      expect(cell).not.toHaveAttribute("data-pinned")
      expect(cell.className).not.toContain("sticky")
    }
  })

  it("renders nothing when no rows are requested", () => {
    const { container } = renderSkeleton({ rowCount: 0 })

    expect(container.querySelectorAll("tbody tr")).toHaveLength(0)
  })
})
