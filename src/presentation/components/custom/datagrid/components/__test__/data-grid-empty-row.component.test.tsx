import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Table, TableBody } from "~/src/presentation/components/shadcn/table"

import { DataGridEmptyRow } from "~/src/presentation/components/custom/datagrid/components/data-grid-empty-row"
import {
  DATA_GRID_EMPTY_MESSAGE_ROW_INDEX,
  DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT,
} from "~/src/presentation/components/custom/datagrid/components/data-grid-row"

const renderEmptyRow = (colSpan = 4, message = "No products match this search") =>
  renderWithProviders(
    <Table>
      <TableBody>
        <DataGridEmptyRow colSpan={colSpan} message={message} />
      </TableBody>
    </Table>,
  )

describe("DataGridEmptyRow", () => {
  afterEach(() => {
    cleanup()
  })

  it("keeps the body at full height with placeholder rows", () => {
    const { container } = renderEmptyRow()

    expect(container.querySelectorAll("tbody tr")).toHaveLength(DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT)
  })

  it("shows the empty message exactly once", () => {
    renderEmptyRow()

    expect(screen.getByText("No products match this search")).toBeInTheDocument()
  })

  it("puts the message on the middle placeholder row and hides the rest from assistive technology", () => {
    const { container } = renderEmptyRow()
    const rows = [...container.querySelectorAll("tbody tr")]
    const messageRow = rows[DATA_GRID_EMPTY_MESSAGE_ROW_INDEX]

    expect(messageRow).toHaveTextContent("No products match this search")
    expect(messageRow?.querySelector('[aria-hidden="true"]')).toBeNull()
    expect(rows[0]?.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it("spans the message cell across every visible column", () => {
    const { container } = renderEmptyRow(7)

    for (const cell of container.querySelectorAll("tbody td")) {
      expect(cell).toHaveAttribute("colspan", "7")
    }
  })
})
