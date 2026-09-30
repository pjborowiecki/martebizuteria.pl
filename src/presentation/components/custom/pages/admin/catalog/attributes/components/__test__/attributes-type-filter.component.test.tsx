import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const grid = vi.hoisted(() => {
  const column: { current: unknown } = { current: undefined }

  return {
    column,
    requestedColumns: [] as string[],
    setFilterValue: vi.fn<(value: unknown) => void>(),
    setPageIndex: vi.fn<(index: number) => void>(),
  }
})

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid", () => ({
  attributesDataGrid: {
    useDataGrid: () => ({
      table: {
        getColumn: (id: string) => {
          grid.requestedColumns.push(id)

          return { getFilterValue: () => grid.column.current, setFilterValue: grid.setFilterValue }
        },
        setPageIndex: grid.setPageIndex,
      },
    }),
  },
}))

import { AttributesTypeFilter } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-type-filter"

const trigger = (): HTMLElement => screen.getByRole("combobox", { name: "Filter by type" })

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  grid.column.current = undefined
  grid.requestedColumns.length = 0
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
})

describe("AttributesTypeFilter", () => {
  it("reads the filter from the type column", () => {
    renderWithProviders(<AttributesTypeFilter />)

    expect(grid.requestedColumns).toContain("type")
  })

  it("shows every type as unfiltered by default", () => {
    renderWithProviders(<AttributesTypeFilter />)

    expect(trigger()).toHaveTextContent("All types")
  })

  it("shows the translated label of the filtered type", () => {
    grid.column.current = "multiselect"
    renderWithProviders(<AttributesTypeFilter />)

    expect(trigger()).toHaveTextContent("Multiple choice")
  })

  it("offers the reset option ahead of every attribute type", async () => {
    renderWithProviders(<AttributesTypeFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual([
      "All types",
      "Text",
      "Number",
      "Yes / No",
      "Single choice",
      "Multiple choice",
    ])
  })

  it("filters the column by the chosen type and returns to the first page", async () => {
    renderWithProviders(<AttributesTypeFilter />)

    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole("option", { name: "Single choice" }))

    expect(grid.setFilterValue).toHaveBeenCalledWith("select")
    expect(grid.setPageIndex).toHaveBeenCalledWith(0)
  })

  it("clears the column filter when every type is chosen", async () => {
    grid.column.current = "select"
    renderWithProviders(<AttributesTypeFilter />)

    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole("option", { name: "All types" }))

    expect(grid.setFilterValue).toHaveBeenCalledWith(undefined)
  })
})
