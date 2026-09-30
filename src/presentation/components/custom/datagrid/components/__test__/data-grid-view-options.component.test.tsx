import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DataGridViewOptions } from "~/src/presentation/components/custom/datagrid/components/data-grid-view-options"

import { DataGridHarness, HARNESS_COLUMNS, type HarnessTable, harnessColumnHelper } from "./data-grid-harness"

const VIEW_LABEL = "Show or hide columns"

const renderViewOptions = () => {
  const seen: { table?: HarnessTable } = {}

  renderWithProviders(
    <DataGridHarness columns={[...HARNESS_COLUMNS, harnessColumnHelper.display({ header: () => <span>Actions</span>, id: "actions" })]}>
      {(table) => {
        seen.table = table

        return <DataGridViewOptions table={table} />
      }}
    </DataGridHarness>,
  )

  return seen
}

describe("DataGridViewOptions", () => {
  afterEach(() => {
    cleanup()
  })

  it("labels the trigger with the translated column visibility message", () => {
    renderViewOptions()

    expect(screen.getByRole("button", { name: VIEW_LABEL })).toBeInTheDocument()
  })

  it("keeps the menu closed until the trigger is used", () => {
    renderViewOptions()

    expect(screen.queryByText("Column visibility")).toBeNull()
  })

  it("lists only the columns that may be hidden, labelled by their string header", async () => {
    renderViewOptions()

    await userEvent.click(screen.getByRole("button", { name: VIEW_LABEL }))
    await screen.findByRole("menu")

    expect(screen.getByText("Column visibility")).toBeInTheDocument()
    expect(screen.getByRole("menuitemcheckbox", { name: "Title" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitemcheckbox", { name: "Price" })).toBeNull()
  })

  it("falls back to the column id when the header is not a plain string", async () => {
    renderViewOptions()

    await userEvent.click(screen.getByRole("button", { name: VIEW_LABEL }))
    await screen.findByRole("menu")

    expect(screen.getByRole("menuitemcheckbox", { name: "actions" })).toBeInTheDocument()
  })

  it("hides a column when its checkbox item is unchecked", async () => {
    const seen = renderViewOptions()

    await userEvent.click(screen.getByRole("button", { name: VIEW_LABEL }))
    await screen.findByRole("menu")
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Title" }))

    expect(seen.table?.getColumn("title")?.getIsVisible()).toBe(false)
    expect(seen.table?.getVisibleLeafColumns().map((column) => column.id)).toStrictEqual(["price", "actions"])
  })

  it("does not repeat a visibility update when external preferences change before the open menu repaints", async () => {
    const seen = renderViewOptions()
    await userEvent.click(screen.getByRole("button", { name: VIEW_LABEL }))
    const checkbox = await screen.findByRole("menuitemcheckbox", { name: "Title" })
    const { table } = seen
    if (table === undefined) {
      throw new Error("expected the rendered table")
    }
    const setVisibility = vi.spyOn(table, "setColumnVisibility")

    act(() => {
      table.setColumnVisibility({ title: false })
      setVisibility.mockClear()
      fireEvent.click(checkbox)
    })

    expect(table.getColumn("title")?.getIsVisible()).toBe(false)
    expect(setVisibility).not.toHaveBeenCalled()
  })
})
