import { cleanup, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  buildDataGridHeaderCellContent,
  renderDataGridHeaderLabel,
} from "~/src/presentation/components/custom/datagrid/components/data-grid-header-content"

import { DataGridHarness, type HarnessTable } from "./data-grid-harness"

const renderHarness = (sortable: boolean): HarnessTable => {
  const seen: { table?: HarnessTable } = {}

  renderWithProviders(
    <DataGridHarness options={{ enableSorting: sortable }}>
      {(table) => {
        seen.table = table

        return <span>ready</span>
      }}
    </DataGridHarness>,
  )

  const { table } = seen
  if (table === undefined) {
    throw new Error("expected the harness to publish a table")
  }

  return table
}

const titleHeader = (table: HarnessTable) => {
  const header = table
    .getHeaderGroups()
    .flatMap((group) => group.headers)
    .find((candidate) => candidate.column.id === "title")
  if (header === undefined) {
    throw new Error("expected a header for the title column")
  }

  return header
}

const cellOptions = (onSort: () => void) => ({
  labelNode: <span>Title</span>,
  onSort,
  sortButtonClassName: "sort-button",
  sortIcon: <span data-testid="sort-icon" />,
  sortLabel: "Sort by Title",
})

describe("renderDataGridHeaderLabel", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the header definition the column declares", () => {
    const header = titleHeader(renderHarness(true))
    const { container } = render(<>{renderDataGridHeaderLabel(header, header.column)}</>)

    expect(container).toHaveTextContent("Title")
  })
})

describe("buildDataGridHeaderCellContent", () => {
  afterEach(() => {
    cleanup()
  })

  it("wraps the label in a sort button for a sortable column", async () => {
    const onSort = vi.fn<() => void>()
    const header = titleHeader(renderHarness(true))

    render(<>{buildDataGridHeaderCellContent({ column: header.column, header, ...cellOptions(onSort) })}</>)
    const button = screen.getByRole("button", { name: "Sort by Title" })

    expect(button).toHaveClass("sort-button")
    expect(screen.getByTestId("sort-icon")).toBeInTheDocument()

    await userEvent.click(button)

    expect(onSort).toHaveBeenCalledTimes(1)
  })

  it("returns the bare label when sorting is switched off for the table", () => {
    const header = titleHeader(renderHarness(false))
    const { container } = render(
      <>{buildDataGridHeaderCellContent({ column: header.column, header, ...cellOptions(vi.fn<() => void>()) })}</>,
    )

    expect(container.querySelector("button")).toBeNull()
    expect(container).toHaveTextContent("Title")
    expect(container.querySelector('[data-testid="sort-icon"]')).toBeNull()
  })

  it("renders nothing for a placeholder header", () => {
    const header = titleHeader(renderHarness(true))
    const placeholder = { ...header, isPlaceholder: true }
    const { container } = render(
      <>{buildDataGridHeaderCellContent({ column: header.column, header: placeholder, ...cellOptions(vi.fn<() => void>()) })}</>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
