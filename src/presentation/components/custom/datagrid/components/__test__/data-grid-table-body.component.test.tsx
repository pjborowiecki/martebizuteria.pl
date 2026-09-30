import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Table, TableBody } from "~/src/presentation/components/shadcn/table"

import { DataGridTableBody } from "~/src/presentation/components/custom/datagrid/components/data-grid-table-body"
import { getDataGridLayoutColumns } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

import { DataGridHarness, HARNESS_ROWS, type HarnessRow } from "./data-grid-harness"

const renderBody = ({
  data = HARNESS_ROWS,
  isLoading = false,
  isPlaceholderBody = false,
  skeletonRowCount = 3,
}: {
  data?: HarnessRow[]
  isLoading?: boolean
  isPlaceholderBody?: boolean
  skeletonRowCount?: number
} = {}) =>
  renderWithProviders(
    <DataGridHarness data={data}>
      {(table) => (
        <Table>
          <TableBody>
            <DataGridTableBody
              columns={getDataGridLayoutColumns(table)}
              emptyMessage="Nothing here yet"
              isLoading={isLoading}
              isPlaceholderBody={isPlaceholderBody}
              persistenceKey="test.products"
              rowReorder={undefined}
              rows={table.getRowModel().rows}
              skeletonRowCount={skeletonRowCount}
              table={table}
              visibleColumnCount={getDataGridLayoutColumns(table).length}
            />
          </TableBody>
        </Table>
      )}
    </DataGridHarness>,
  )

describe("DataGridTableBody", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the rows it is given when there is nothing to wait for", () => {
    const { container } = renderBody()

    expect(container.querySelectorAll("tbody tr")).toHaveLength(HARNESS_ROWS.length)
    expect(screen.getByText("Gold ring")).toBeInTheDocument()
  })

  it("replaces the rows with the empty message once the data is empty", () => {
    renderBody({ data: [] })

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument()
    expect(screen.queryByText("Gold ring")).toBeNull()
  })

  it("spans the empty message across the visible columns", () => {
    const { container } = renderBody({ data: [] })

    for (const cell of container.querySelectorAll("tbody td")) {
      expect(cell).toHaveAttribute("colspan", "2")
    }
  })

  it("prefers the skeleton over both the rows and the empty message while loading", () => {
    const { container } = renderBody({ isLoading: true, skeletonRowCount: 4 })

    expect(container.querySelectorAll("tbody tr")).toHaveLength(4)
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8)
    expect(screen.queryByText("Gold ring")).toBeNull()
    expect(screen.queryByText("Nothing here yet")).toBeNull()
  })

  it("keeps the skeleton borderless while it stands in for an empty body", () => {
    const { container } = renderBody({ data: [], isLoading: true, isPlaceholderBody: true, skeletonRowCount: 2 })
    const rows = [...container.querySelectorAll("tbody tr")]

    expect(rows).toHaveLength(2)
    expect(rows[0]?.className).toContain("border-b-0")
  })

  it("keeps the skeleton rows bordered when they stand in for known rows", () => {
    const { container } = renderBody({ isLoading: true, isPlaceholderBody: false, skeletonRowCount: 2 })
    const rows = [...container.querySelectorAll("tbody tr")]

    expect(rows[0]?.className).not.toContain("border-b-0")
  })
})
