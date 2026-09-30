import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const grid = vi.hoisted(() => {
  const column: { current: unknown } = { current: undefined }

  return { column, hasColumn: true, requestedColumns: [] as string[], setFilterValue: vi.fn<(value: unknown) => void>() }
})

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid", () => ({
  categoriesDataGrid: {
    useDataGrid: () => ({
      table: {
        getColumn: (id: string) => {
          grid.requestedColumns.push(id)

          return grid.hasColumn ? { getFilterValue: () => grid.column.current, setFilterValue: grid.setFilterValue } : undefined
        },
      },
    }),
  },
}))

import { CategoriesStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-status-filter"

const trigger = (): HTMLElement => screen.getByRole("combobox", { name: "Filter by status" })

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn(), writable: true })
  grid.column.current = undefined
  grid.hasColumn = true
  grid.requestedColumns.length = 0
})

describe("CategoriesStatusFilter", () => {
  it("reads the filter from the status column", () => {
    renderWithProviders(<CategoriesStatusFilter />)

    expect(grid.requestedColumns).toContain("status")
  })

  it("shows every status as unfiltered by default", () => {
    renderWithProviders(<CategoriesStatusFilter />)

    expect(trigger()).toHaveTextContent("All statuses")
  })

  it("shows the active status the column is filtered by", () => {
    grid.column.current = "active"
    renderWithProviders(<CategoriesStatusFilter />)

    expect(trigger()).toHaveTextContent("Active")
  })

  it("falls back to all statuses for a filter value that is not a status string", () => {
    grid.column.current = { operator: "eq" }
    renderWithProviders(<CategoriesStatusFilter />)

    expect(trigger()).toHaveTextContent("All statuses")
  })

  it("keeps the filter usable when the table has no status column", async () => {
    grid.hasColumn = false
    renderWithProviders(<CategoriesStatusFilter />)

    expect(trigger()).toHaveTextContent("All statuses")

    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole("option", { name: "Draft" }))

    expect(grid.setFilterValue).not.toHaveBeenCalled()
    expect(trigger()).toHaveTextContent("All statuses")
  })

  it("filters the column by the chosen status", async () => {
    renderWithProviders(<CategoriesStatusFilter />)

    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole("option", { name: "Draft" }))

    expect(grid.setFilterValue).toHaveBeenCalledWith("draft")
  })

  it("clears the column filter when every status is chosen", async () => {
    grid.column.current = "draft"
    renderWithProviders(<CategoriesStatusFilter />)

    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole("option", { name: "All statuses" }))

    expect(grid.setFilterValue).toHaveBeenCalledWith(undefined)
  })

  it("offers exactly the two category statuses plus the reset option", async () => {
    renderWithProviders(<CategoriesStatusFilter />)

    await userEvent.click(trigger())

    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All statuses", "Active", "Draft"])
  })
})
