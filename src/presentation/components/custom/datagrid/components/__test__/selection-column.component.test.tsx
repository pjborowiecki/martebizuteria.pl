import { flexRender } from "@tanstack/react-table"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"

import { DataGridHarness, HARNESS_COLUMNS, type HarnessTable, harnessColumnHelper } from "./data-grid-harness"

const LABELS = { all: "Select all rows", row: "Select row" }

const selectColumn = selectionColumn(harnessColumnHelper, LABELS)

const renderSelection = (options?: { readonly enableRowSelection: (row: { original: { id: string } }) => boolean }) => {
  const seen: { table?: HarnessTable } = {}

  renderWithProviders(
    <DataGridHarness columns={[selectColumn, ...HARNESS_COLUMNS]} options={options}>
      {(table) => {
        seen.table = table
        const header = table
          .getHeaderGroups()
          .flatMap((group) => group.headers)
          .find((candidate) => candidate.column.id === "select")

        return (
          <div>
            {header === undefined ? undefined : flexRender(header.column.columnDef.header, header.getContext())}
            {table.getRowModel().rows.map((row) => {
              const cell = row.getAllCells().find((candidate) => candidate.column.id === "select")

              return <div key={row.id}>{cell === undefined ? undefined : flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
            })}
          </div>
        )
      }}
    </DataGridHarness>,
  )

  return seen
}

describe("selectionColumn", () => {
  afterEach(() => {
    cleanup()
  })

  it("is pinned out of the column menu and drawn as a checkbox skeleton", () => {
    expect(selectColumn.id).toBe("select")
    expect(selectColumn.enableHiding).toBe(false)
    expect(selectColumn.enableSorting).toBe(false)
    expect(selectColumn.enableResizing).toBe(false)
    expect(selectColumn.meta?.skeletonVariant).toBe("checkbox")
    expect(selectColumn.meta?.preventRowClick).toBe(true)
  })

  it("pins the column to a fixed width so it never resizes", () => {
    expect(selectColumn.size).toBe(40)
    expect(selectColumn.minSize).toBe(40)
    expect(selectColumn.maxSize).toBe(40)
  })

  it("renders one labelled checkbox per row plus the select all control", () => {
    renderSelection()

    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument()
    expect(screen.getAllByRole("checkbox", { name: "Select row" })).toHaveLength(3)
  })

  it("selects a single row and reports the page as partially selected", async () => {
    const seen = renderSelection()

    const [firstRowCheckbox] = screen.getAllByRole("checkbox", { name: "Select row" })
    await userEvent.click(firstRowCheckbox ?? screen.getByRole("checkbox", { name: "Select row" }))

    expect(seen.table?.getSelectedRowModel().rows.map((row) => row.id)).toStrictEqual(["silver-ring"])
    expect(seen.table?.getIsSomePageRowsSelected()).toBe(true)
    expect(seen.table?.getIsAllPageRowsSelected()).toBe(false)
  })

  it("selects every row on the page from the header checkbox and clears them again", async () => {
    const seen = renderSelection()
    const selectAll = screen.getByRole("checkbox", { name: "Select all rows" })

    await userEvent.click(selectAll)

    expect(seen.table?.getIsAllPageRowsSelected()).toBe(true)

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }))

    expect(seen.table?.getSelectedRowModel().rows).toStrictEqual([])
  })

  it("disables the checkbox of a row that may not be selected", () => {
    renderSelection({ enableRowSelection: (row) => row.original.id !== "gold-ring" })

    const [first, second] = screen.getAllByRole("checkbox", { name: "Select row" })

    expect(second).toHaveAttribute("aria-disabled", "true")
    expect(first).not.toHaveAttribute("aria-disabled", "true")
  })
})
