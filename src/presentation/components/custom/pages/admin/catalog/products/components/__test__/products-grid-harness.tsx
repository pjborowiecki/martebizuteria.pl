import { type JSX, type ReactNode } from "react"

import { type Table, createColumnHelper, useTable } from "@tanstack/react-table"

import { type Product } from "~/src/modules/product/product.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import {
  PRODUCTS_DATA_GRID_KEY,
  productsDataGrid,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"

export type ProductRow = Product["adminListItem"]

export type ProductsTable = Table<DataGridFeatures, ProductRow>

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

export const productRow = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: "silver-ring",
  id: "product-1",
  inventoryLevel: "ok",
  metadata: null,
  primaryCategoryId: null,
  rank: 0,
  status: "published",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierscionek" },
  totalStock: 4,
  updatedAt: EPOCH,
  variantCount: 2,
  ...overrides,
})

const columnHelper = createColumnHelper<DataGridFeatures, ProductRow>()

const PRODUCT_COLUMNS = columnHelper.columns([
  columnHelper.accessor("handle", { header: "Handle" }),
  columnHelper.accessor("status", { filterFn: "equalsString", header: "Status" }),
])

export const ProductsGridHarness = ({
  children,
  isLoading = false,
  rows,
}: Readonly<{
  children: (table: ProductsTable) => ReactNode
  isLoading?: boolean
  rows: readonly ProductRow[]
}>): JSX.Element => {
  const table = useTable<DataGridFeatures, ProductRow>({
    columns: PRODUCT_COLUMNS,
    data: [...rows],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  const value: DataGridContextValue<ProductRow> = {
    columnReorder: {
      draggedColumnId: undefined,
      onColumnDragEnd: () => {},
      onColumnDragOver: () => {},
      onColumnDragStart: () => {},
    },
    hasPreferenceOverrides: false,
    isLoading,
    persistenceKey: PRODUCTS_DATA_GRID_KEY,
    resetPreferences: () => {},
    rowReorder: undefined,
    searchPlaceholder: "Search products",
    table,
  }

  return <productsDataGrid.Provider value={value}>{children(table)}</productsDataGrid.Provider>
}
