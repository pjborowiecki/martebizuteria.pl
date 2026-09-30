import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AttributesTable } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-table"

const search = vi.hoisted(() => ({ create: undefined as string | undefined }))

const grid = vi.hoisted(() => ({ useDataGrid: vi.fn<(options: { readonly onRowClick: (row: unknown) => void }) => unknown>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return { ...actual, useSearch: () => ({ create: search.create }) }
})

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid", () => ({
  attributesDataGrid: {
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

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid", () => ({
  useAttributesDataGrid: (options: { readonly onRowClick: (row: unknown) => void }) => grid.useDataGrid(options),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-stats", () => ({
  AttributesStats: (): JSX.Element => <div data-testid="attributes-stats" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-bulk-actions", () => ({
  AttributesBulkActions: (): JSX.Element => <div data-testid="attributes-bulk" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-export-action", () => ({
  AttributesExportAction: (): JSX.Element => <div data-testid="attributes-export" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-refresh-action", () => ({
  AttributesRefreshAction: (): JSX.Element => <div data-testid="attributes-refresh" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-type-filter", () => ({
  AttributesTypeFilter: (): JSX.Element => <div data-testid="attributes-type-filter" />,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-sheet", () => ({
  AttributeSheet: ({
    attribute,
    mode,
    onOpenChange,
  }: {
    readonly attribute: { readonly id: string } | undefined
    readonly mode: string
    readonly onOpenChange: (open: boolean) => void
  }): JSX.Element => (
    <div data-testid="attribute-sheet">
      <span>{`sheet ${mode} ${attribute?.id ?? "none"}`}</span>
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

beforeEach(() => {
  search.create = undefined
})

afterEach(() => {
  cleanup()
  grid.useDataGrid.mockReset()
})

const ATTRIBUTE = { id: "attribute-1" }

const rowClick = () => {
  const [options] = grid.useDataGrid.mock.calls[0] ?? []
  if (options === undefined) {
    throw new Error("expected the table to build a data grid")
  }

  return options.onRowClick
}

describe("AttributesTable", () => {
  it("lays the statistics, the toolbar and the grid out in order", () => {
    renderWithProviders(<AttributesTable />)

    expect(screen.getByTestId("attributes-stats")).toBeInTheDocument()
    expect(screen.getByTestId("grid-toolbar")).toBeInTheDocument()
    expect(screen.getByTestId("grid-body")).toBeInTheDocument()
    expect(screen.getByTestId("grid-pagination")).toBeInTheDocument()
  })

  it("offers the refresh, export and type filter controls in the toolbar", () => {
    renderWithProviders(<AttributesTable />)

    const toolbar = screen.getByTestId("grid-toolbar")
    expect(toolbar).toContainElement(screen.getByTestId("attributes-refresh"))
    expect(toolbar).toContainElement(screen.getByTestId("attributes-export"))
    expect(toolbar).toContainElement(screen.getByTestId("attributes-type-filter"))
    expect(toolbar).toContainElement(screen.getByTestId("attributes-bulk"))
  })

  it("labels the add button with the translated action", () => {
    renderWithProviders(<AttributesTable />)

    expect(screen.getByRole("button", { name: "Add attribute" })).toBeInTheDocument()
  })

  it("keeps the sheet closed without a create flag in the url", () => {
    renderWithProviders(<AttributesTable />)

    expect(screen.queryByTestId("attribute-sheet")).toBeNull()
  })

  it("opens a blank sheet when the url asks to create", async () => {
    search.create = "1"

    renderWithProviders(<AttributesTable />)

    expect(await screen.findByText("sheet create none")).toBeInTheDocument()
  })

  it("ignores any other value of the create flag", () => {
    search.create = "0"

    renderWithProviders(<AttributesTable />)

    expect(screen.queryByTestId("attribute-sheet")).toBeNull()
  })

  it("opens a blank sheet from the add button", async () => {
    renderWithProviders(<AttributesTable />)

    await userEvent.click(screen.getByRole("button", { name: "Add attribute" }))

    expect(screen.getByText("sheet create none")).toBeInTheDocument()
  })

  it("opens the clicked attribute for editing", async () => {
    renderWithProviders(<AttributesTable />)

    rowClick()(ATTRIBUTE)

    expect(await screen.findByText("sheet edit attribute-1")).toBeInTheDocument()
  })

  it("closes the sheet when it reports being dismissed", async () => {
    renderWithProviders(<AttributesTable />)
    rowClick()(ATTRIBUTE)

    await userEvent.click(await screen.findByRole("button", { name: "dismiss sheet" }))

    expect(screen.queryByTestId("attribute-sheet")).toBeNull()
  })
})
