import { type JSX } from "react"

import { flexRender, useTable } from "@tanstack/react-table"
import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { useCollectionColumns } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-columns"
import {
  COLLECTIONS_DATA_GRID_KEY,
  collectionsDataGrid,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-row-actions", () => ({
  CollectionsRowActions: ({ collection }: { readonly collection: { readonly id: string } }) => <span>actions for {collection.id}</span>,
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

import { type CollectionRow, collectionRow } from "./collections-grid-harness"

const ROWS: CollectionRow[] = [
  collectionRow({
    createdAt: new Date("2026-03-14T10:00:00.000Z"),
    descriptions: { "en-US": "The freshest pieces", "pl-PL": "Najnowsze wzory" },
    handle: "new-arrivals",
    id: "collection-1",
    image: "collections/new-arrivals.webp",
    productCount: 4,
    status: "active",
    titles: { "en-US": "New arrivals", "pl-PL": "Nowosci" },
    updatedAt: new Date("2026-04-02T10:00:00.000Z"),
  }),
  collectionRow({
    createdAt: new Date("2026-03-14T10:00:00.000Z"),
    descriptions: null,
    handle: "sale",
    id: "collection-2",
    image: null,
    productCount: 0,
    status: "draft",
    titles: { "en-US": "", "pl-PL": "Wyprzedaz" },
    updatedAt: new Date("2026-03-14T10:00:00.000Z"),
  }),
]

const CellsProbe = ({ rowId }: Readonly<{ rowId: string }>): JSX.Element => {
  const columns = useCollectionColumns()
  const table = useTable<DataGridFeatures, CollectionRow>({
    columns,
    data: ROWS,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  const value: DataGridContextValue<CollectionRow> = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading: false,
    persistenceKey: COLLECTIONS_DATA_GRID_KEY,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search collections",
    table,
  }

  return (
    <collectionsDataGrid.Provider value={value}>
      {table
        .getRow(rowId)
        .getAllCells()
        .map((cell) => (
          <div data-testid={`cell-${cell.column.id}`} key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
    </collectionsDataGrid.Provider>
  )
}

const cell = (columnId: string): HTMLElement => screen.getByTestId(`cell-${columnId}`)

afterEach(cleanup)

describe("collection row cells", () => {
  it("shows the localized title over its storefront path", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("title")).getByText("New arrivals")).toBeInTheDocument()
    expect(within(cell("title")).getByText("/new-arrivals")).toBeInTheDocument()
  })

  it("falls back to the default locale title when the admin locale has none", () => {
    renderWithProviders(<CellsProbe rowId="collection-2" />)

    expect(within(cell("title")).getByText("Wyprzedaz")).toBeInTheDocument()
  })

  it("shows the collection thumbnail described by its title", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("image")).getByRole("img", { name: "New arrivals" })).toHaveAttribute("src", "collections/new-arrivals.webp")
  })

  it("leaves the thumbnail slot empty when the collection has no image", () => {
    renderWithProviders(<CellsProbe rowId="collection-2" />)

    expect(within(cell("image")).queryByRole("img")).not.toBeInTheDocument()
  })

  it("prints the record id verbatim", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("recordId")).getByText("collection-1")).toBeInTheDocument()
  })

  it("badges an active collection", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("status")).getByText("Active")).toBeInTheDocument()
  })

  it("badges a draft collection", () => {
    renderWithProviders(<CellsProbe rowId="collection-2" />)

    expect(within(cell("status")).getByText("Draft")).toBeInTheDocument()
  })

  it("shows the product count", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("productCount")).getByText("4")).toBeInTheDocument()
  })

  it("shows the localized description", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("description")).getByText("The freshest pieces")).toBeInTheDocument()
  })

  it("marks a collection without a description as empty", () => {
    renderWithProviders(<CellsProbe rowId="collection-2" />)

    expect(within(cell("description")).getByText("—")).toBeInTheDocument()
  })

  it("formats both timestamps as medium dates", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("createdAt")).getByText("Mar 14, 2026")).toBeInTheDocument()
    expect(within(cell("editedAt")).getByText("Apr 2, 2026")).toBeInTheDocument()
  })

  it("offers a reorder handle that stays disabled while reordering is off", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("drag")).getByRole("button", { name: "Drag to reorder, or use arrow keys" })).toBeDisabled()
  })

  it("hands the row to the row actions menu", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("actions")).getByText("actions for collection-1")).toBeInTheDocument()
  })

  it("offers a checkbox to select the row", () => {
    renderWithProviders(<CellsProbe rowId="collection-1" />)

    expect(within(cell("select")).getByRole("checkbox")).toBeInTheDocument()
  })
})
