import { type JSX, type ReactNode } from "react"

import { type Table, createColumnHelper, useTable } from "@tanstack/react-table"
import { vi } from "vite-plus/test"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue, type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import {
  COLLECTIONS_DATA_GRID_KEY,
  collectionsDataGrid,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"

export type CollectionRow = ProductCollection["adminListItem"]

export type CollectionsTable = Table<DataGridFeatures, CollectionRow>

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

export const collectionRow = (overrides: Partial<CollectionRow> = {}): CollectionRow => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: "new-arrivals",
  id: "collection-1",
  image: null,
  metadata: null,
  productCount: 4,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  titles: { "en-US": "New arrivals", "pl-PL": "Nowosci" },
  updatedAt: EPOCH,
  ...overrides,
})

const columnHelper = createColumnHelper<DataGridFeatures, CollectionRow>()

export const COLLECTION_COLUMNS = columnHelper.columns([
  columnHelper.accessor("handle", { header: "Handle" }),
  columnHelper.accessor("status", { filterFn: "equalsString", header: "Status" }),
])

export const createRowReorderApi = (): RowReorderApi & {
  readonly onRowDragEnter: ReturnType<typeof vi.fn>
  readonly onRowDragStart: ReturnType<typeof vi.fn>
  readonly onRowDrop: ReturnType<typeof vi.fn>
  readonly onRowMove: ReturnType<typeof vi.fn>
} => ({
  draggingId: undefined,
  enabled: true,
  onRowDragEnter: vi.fn<(id: string) => void>(),
  onRowDragStart: vi.fn<(id: string) => void>(),
  onRowDrop: vi.fn<() => void>(),
  onRowMove: vi.fn<(id: string, direction: "down" | "up") => void>(),
})

export const CollectionsGridHarness = ({
  children,
  isLoading = false,
  rowReorder,
  rows,
}: Readonly<{
  children: (table: CollectionsTable) => ReactNode
  isLoading?: boolean
  rowReorder?: RowReorderApi | undefined
  rows: readonly CollectionRow[]
}>): JSX.Element => {
  const table = useTable<DataGridFeatures, CollectionRow>({
    columns: COLLECTION_COLUMNS,
    data: [...rows],
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
    isLoading,
    persistenceKey: COLLECTIONS_DATA_GRID_KEY,
    resetPreferences: () => {},
    rowReorder,
    searchPlaceholder: "Search collections",
    table,
  }

  return <collectionsDataGrid.Provider value={value}>{children(table)}</collectionsDataGrid.Provider>
}
