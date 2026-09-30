import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionsTable } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-table"

const grid = vi.hoisted(() => ({ useDataGrid: vi.fn<(options: { readonly onRowClick: (row: unknown) => void }) => unknown>() }))

const sheetProps = vi.hoisted(() => ({
  record: vi.fn<(props: { readonly collection: { readonly id: string } | undefined; readonly mode: string }) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid", () => ({
  collectionsDataGrid: {
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

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-data-grid", () => ({
  useCollectionsDataGrid: (options: { readonly onRowClick: (row: unknown) => void }) => grid.useDataGrid(options),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-stats", () => ({
  CollectionsStats: (): JSX.Element => <div data-testid="collections-stats" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-bulk-actions", () => ({
  CollectionsBulkActions: (): JSX.Element => <div data-testid="collections-bulk" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-export-action", () => ({
  CollectionsExportAction: (): JSX.Element => <div data-testid="collections-export" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-refresh-action", () => ({
  CollectionsRefreshAction: (): JSX.Element => <div data-testid="collections-refresh" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-status-filter", () => ({
  CollectionsStatusFilter: (): JSX.Element => <div data-testid="collections-status-filter" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-sheet", () => ({
  CollectionSheet: ({
    collection,
    mode,
    onOpenChange,
  }: {
    readonly collection: { readonly id: string } | undefined
    readonly mode: string
    readonly onOpenChange: (open: boolean) => void
  }): JSX.Element => {
    sheetProps.record({ collection, mode })

    return (
      <div data-testid="collection-sheet">
        <span>{`sheet ${mode} ${collection?.id ?? "none"}`}</span>
        <button
          onClick={() => {
            onOpenChange(false)
          }}
          type="button"
        >
          dismiss sheet
        </button>
      </div>
    )
  },
}))

afterEach(() => {
  cleanup()
  grid.useDataGrid.mockReset()
  sheetProps.record.mockReset()
})

const COLLECTION = { id: "collection-1" }

const openRow = () => {
  const [options] = grid.useDataGrid.mock.calls[0] ?? []
  if (options === undefined) {
    throw new Error("expected the table to build a data grid")
  }
  options.onRowClick(COLLECTION)
}

describe("CollectionsTable", () => {
  it("lays the statistics, the toolbar and the grid out in order", () => {
    renderWithProviders(<CollectionsTable />)

    expect(screen.getByTestId("collections-stats")).toBeInTheDocument()
    expect(screen.getByTestId("grid-toolbar")).toBeInTheDocument()
    expect(screen.getByTestId("grid-body")).toBeInTheDocument()
    expect(screen.getByTestId("grid-pagination")).toBeInTheDocument()
  })

  it("offers the refresh, export and status filter controls in the toolbar", () => {
    renderWithProviders(<CollectionsTable />)

    const toolbar = screen.getByTestId("grid-toolbar")
    expect(toolbar).toContainElement(screen.getByTestId("collections-refresh"))
    expect(toolbar).toContainElement(screen.getByTestId("collections-export"))
    expect(toolbar).toContainElement(screen.getByTestId("collections-status-filter"))
    expect(toolbar).toContainElement(screen.getByTestId("collections-bulk"))
  })

  it("labels the add button with the translated action", () => {
    renderWithProviders(<CollectionsTable />)

    expect(screen.getByRole("button", { name: "Add collection" })).toBeInTheDocument()
  })

  it("keeps the sheet out of the tree while it is closed", () => {
    renderWithProviders(<CollectionsTable />)

    expect(screen.queryByTestId("collection-sheet")).toBeNull()
  })

  it("opens a blank sheet from the add button", async () => {
    renderWithProviders(<CollectionsTable />)

    await userEvent.click(screen.getByRole("button", { name: "Add collection" }))

    expect(screen.getByText("sheet create none")).toBeInTheDocument()
  })

  it("opens the clicked collection for editing", async () => {
    renderWithProviders(<CollectionsTable />)
    const [options] = grid.useDataGrid.mock.calls[0] ?? []

    options?.onRowClick(COLLECTION)

    expect(await screen.findByText("sheet edit collection-1")).toBeInTheDocument()
  })

  it("closes the sheet when it reports being dismissed", async () => {
    renderWithProviders(<CollectionsTable />)
    openRow()

    await userEvent.click(await screen.findByRole("button", { name: "dismiss sheet" }))

    expect(screen.queryByTestId("collection-sheet")).toBeNull()
  })

  it("hands the row click handler to the data grid hook", () => {
    renderWithProviders(<CollectionsTable />)

    expect(grid.useDataGrid).toHaveBeenCalled()
    expect(typeof grid.useDataGrid.mock.calls[0]?.[0]?.onRowClick).toBe("function")
  })
})
