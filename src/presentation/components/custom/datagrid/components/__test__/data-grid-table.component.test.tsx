import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridTable } from "~/src/presentation/components/custom/datagrid/components/data-grid-table"
import { type ColumnReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

import { DataGridHarness, HARNESS_ROWS, type HarnessRow, stubResizeObserver } from "./data-grid-harness"

stubResizeObserver()

const columnReorder: ColumnReorderApi = {
  draggedColumnId: undefined,
  onColumnDragEnd: vi.fn<() => void>(),
  onColumnDragOver: vi.fn<(overId: string) => void>(),
  onColumnDragStart: vi.fn<(id: string) => void>(),
}

const renderTable = ({
  data = HARNESS_ROWS,
  isLoading = false,
  onRowClick,
  onRowPointerDown,
}: {
  data?: HarnessRow[]
  isLoading?: boolean
  onRowClick?: (row: HarnessRow) => void
  onRowPointerDown?: (row: HarnessRow) => void
} = {}) =>
  renderWithProviders(
    <DataGridHarness data={data}>
      {(table) => (
        <DataGridTable
          columnReorder={columnReorder}
          isLoading={isLoading}
          onRowClick={onRowClick}
          onRowPointerDown={onRowPointerDown}
          persistenceKey="test.products"
          rowReorder={undefined}
          table={table}
        />
      )}
    </DataGridHarness>,
  )

describe("DataGridTable", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders one header cell per visible column with a sort control", () => {
    renderTable()

    expect(screen.getAllByRole("columnheader")).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Sort by Title" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sort by Price" })).toBeInTheDocument()
  })

  it("renders one body row per row model row", () => {
    const { container } = renderTable()

    expect(container.querySelectorAll("tbody tr")).toHaveLength(HARNESS_ROWS.length)
    expect(screen.getByText("Silver chain")).toBeInTheDocument()
  })

  it("sorts the rows by the column the header control belongs to", async () => {
    const { container } = renderTable()
    const sortByPrice = screen.getByRole("button", { name: "Sort by Price" })

    await userEvent.click(sortByPrice)

    expect(container.querySelector("tbody tr td")).toHaveTextContent("Gold ring")

    await userEvent.click(sortByPrice)

    expect(container.querySelector("tbody tr td")).toHaveTextContent("Silver chain")
  })

  it("shows the translated empty message when nothing matches", () => {
    renderTable({ data: [] })

    expect(screen.getByText("No data to display")).toBeInTheDocument()
  })

  it("draws one skeleton row per known row while loading", () => {
    const { container } = renderTable({ isLoading: true })

    expect(container.querySelectorAll("tbody tr")).toHaveLength(HARNESS_ROWS.length)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText("Silver chain")).toBeNull()
  })

  it("keeps the body at placeholder height while loading an unknown row count", () => {
    const { container } = renderTable({ data: [], isLoading: true })

    expect(container.querySelectorAll("tbody tr")).toHaveLength(5)
    expect(screen.queryByText("No data to display")).toBeNull()
  })

  it("reports the clicked row to the row click handler", async () => {
    const onRowClick = vi.fn<(row: HarnessRow) => void>()
    renderTable({ onRowClick })

    await userEvent.click(screen.getByText("Gold ring"))

    expect(onRowClick).toHaveBeenCalledWith(HARNESS_ROWS[1])
  })

  it("does not make rows clickable when no handler is supplied", async () => {
    const { container } = renderTable()

    await userEvent.click(screen.getByText("Gold ring"))

    expect(container.querySelector("tbody tr")?.className).not.toContain("cursor-pointer")
  })

  it("reports a pressed row, never a hovered one, so the page can prefetch it", async () => {
    const onRowPointerDown = vi.fn<(row: HarnessRow) => void>()
    renderTable({ onRowPointerDown })

    await userEvent.hover(screen.getByText("Gold ring"))

    expect(onRowPointerDown).not.toHaveBeenCalled()

    await userEvent.pointer({ keys: "[MouseLeft>]", target: screen.getByText("Gold ring") })

    expect(onRowPointerDown).toHaveBeenCalledExactlyOnceWith(HARNESS_ROWS[1])
  })

  it("renders one column group entry per visible column", () => {
    const { container } = renderTable()

    expect(container.querySelectorAll("colgroup col")).toHaveLength(2)
  })

  it("keeps the header row above an empty body", () => {
    renderTable({ data: [] })

    expect(screen.getAllByRole("columnheader")).toHaveLength(2)
  })
})
