import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const grid = vi.hoisted(() => ({ useDataGrid: vi.fn<(options: { readonly onRowClick: (row: unknown) => void }) => unknown>() }))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid", () => ({
  categoriesDataGrid: {
    Body: (): JSX.Element => <div data-testid="grid-body" />,
    Pagination: (): JSX.Element => <div data-testid="grid-pagination" />,
    Provider: ({ children }: { readonly children: ReactNode }): JSX.Element => <div data-testid="grid-provider">{children}</div>,
    Toolbar: ({ actions, children }: { readonly actions: ReactNode; readonly children: ReactNode }): JSX.Element => (
      <div data-testid="grid-toolbar">
        {children}
        {actions}
      </div>
    ),
  },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-data-grid", () => ({
  useCategoriesDataGrid: (options: { readonly onRowClick: (row: unknown) => void }) => grid.useDataGrid(options),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-stats", () => ({
  CategoriesStats: (): JSX.Element => <div data-testid="categories-stats" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-bulk-actions", () => ({
  CategoriesBulkActions: (): JSX.Element => <div data-testid="categories-bulk" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-export-action", () => ({
  CategoriesExportAction: (): JSX.Element => <div data-testid="categories-export" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-refresh-action", () => ({
  CategoriesRefreshAction: (): JSX.Element => <div data-testid="categories-refresh" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-status-filter", () => ({
  CategoriesStatusFilter: (): JSX.Element => <div data-testid="categories-status-filter" />,
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-sheet", () => ({
  CategorySheet: ({
    category,
    mode,
    onOpenChange,
  }: {
    readonly category: { readonly id: string } | undefined
    readonly mode: string
    readonly onOpenChange: (open: boolean) => void
  }): JSX.Element => (
    <div data-testid="category-sheet">
      <span>{`sheet ${mode} ${category?.id ?? "none"}`}</span>
      <button
        onClick={() => {
          onOpenChange(false)
        }}
        type="button"
      >
        dismiss sheet
      </button>
    </div>
  ),
}))

import { CategoriesTable } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-table"

const CATEGORY = { id: "category-1" }

const openRow = (): void => {
  const [options] = grid.useDataGrid.mock.calls[0] ?? []
  if (options === undefined) {
    throw new Error("expected the table to build a data grid")
  }
  options.onRowClick(CATEGORY)
}

afterEach(() => {
  cleanup()
  grid.useDataGrid.mockReset()
})

describe("CategoriesTable", () => {
  it("lays the statistics, the toolbar and the grid out in order", () => {
    renderWithProviders(<CategoriesTable />)

    expect(screen.getByTestId("categories-stats")).toBeInTheDocument()
    expect(screen.getByTestId("grid-toolbar")).toBeInTheDocument()
    expect(screen.getByTestId("grid-body")).toBeInTheDocument()
    expect(screen.getByTestId("grid-pagination")).toBeInTheDocument()
  })

  it("offers the refresh, export and status filter controls in the toolbar", () => {
    renderWithProviders(<CategoriesTable />)
    const toolbar = screen.getByTestId("grid-toolbar")

    expect(toolbar).toContainElement(screen.getByTestId("categories-refresh"))
    expect(toolbar).toContainElement(screen.getByTestId("categories-export"))
    expect(toolbar).toContainElement(screen.getByTestId("categories-status-filter"))
    expect(toolbar).toContainElement(screen.getByTestId("categories-bulk"))
  })

  it("labels the add button with the translated action", () => {
    renderWithProviders(<CategoriesTable />)

    expect(screen.getByRole("button", { name: "Add category" })).toBeInTheDocument()
  })

  it("keeps the sheet out of the tree while it is closed", () => {
    renderWithProviders(<CategoriesTable />)

    expect(screen.queryByTestId("category-sheet")).toBeNull()
  })

  it("opens a blank sheet from the add button", async () => {
    renderWithProviders(<CategoriesTable />)

    await userEvent.click(screen.getByRole("button", { name: "Add category" }))

    expect(screen.getByText("sheet create none")).toBeInTheDocument()
  })

  it("opens the clicked category for editing", async () => {
    renderWithProviders(<CategoriesTable />)
    openRow()

    expect(await screen.findByText("sheet edit category-1")).toBeInTheDocument()
  })

  it("closes the sheet when it reports being dismissed", async () => {
    renderWithProviders(<CategoriesTable />)
    openRow()

    await userEvent.click(await screen.findByRole("button", { name: "dismiss sheet" }))

    expect(screen.queryByTestId("category-sheet")).toBeNull()
  })

  it("hands the row click handler to the data grid hook", () => {
    renderWithProviders(<CategoriesTable />)

    expect(typeof grid.useDataGrid.mock.calls[0]?.[0]?.onRowClick).toBe("function")
  })
})
