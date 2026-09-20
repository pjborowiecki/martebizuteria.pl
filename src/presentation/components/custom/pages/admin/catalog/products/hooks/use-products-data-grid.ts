import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { type ColumnFiltersState, type PaginationState, type SortingState, type Table } from "@tanstack/react-table"
import { useTranslations } from "use-intl"

import {
  type AdminProductsListColumnFilters,
  hasAdminProductsListColumnFilters,
  parseAdminProductsListColumnFilters,
} from "~/src/modules/product/product.admin-list-filters"
import { type AdminProductsListSort, parseAdminProductsListSort } from "~/src/modules/product/product.admin-list-sort"
import { type AdminProductsExportInput } from "~/src/modules/product/product.admin-list.types"
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  PRODUCT_TABLE_COLUMN_ID,
  PRODUCT_TABLE_COLUMN_PINNING,
  PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type ProductInventoryLevel,
  type ProductStatus,
  type ProductVariantKind,
} from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import { useAdminDebouncedTableSearch } from "~/src/presentation/components/custom/datagrid/hooks/use-admin-debounced-table-search"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useProductColumns } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-columns"
import { useProductsListData } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-list-data"
import { useProductsRowReorder } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-row-reorder"
import { useProductsServerListSync } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-server-list-sync"
import { productsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"
const setProductsListFilterValue = <Key extends keyof ProductsListFilters>(
  next: MutableProductsListFilters,
  key: Key,
  value: ProductsListFilters[Key] | undefined,
): void => {
  if (value === undefined) {
    delete next[key]
  } else {
    next[key] = value
  }
}
const applyProductsListFilterPatch = (previous: ProductsListFilters, patch: ProductsListFilterPatch | undefined): ProductsListFilters => {
  if (patch === undefined) {
    return {}
  }
  const next: MutableProductsListFilters = {
    ...previous,
  }
  for (const key of PRODUCTS_LIST_FILTER_PATCH_KEYS) {
    if (key in patch) {
      setProductsListFilterValue(next, key, patch[key])
    }
  }
  return next
}
export const hasProductsListFilters = (filters: ProductsListFilters): boolean =>
  filters.categoryId !== undefined ||
  filters.collectionId !== undefined ||
  filters.inventoryLevel !== undefined ||
  filters.status !== undefined ||
  filters.variantKind !== undefined

export const hasProductsServerListQuery = (
  filters: ProductsListFilters,
  search: string,
  columnFilters: AdminProductsListColumnFilters,
): boolean => hasProductsListFilters(filters) || search !== "" || hasAdminProductsListColumnFilters(columnFilters)

const buildProductsExportListInput = ({
  columnFilters,
  filters,
  listSort,
  serverSearch,
}: {
  readonly columnFilters: AdminProductsListColumnFilters
  readonly filters: ProductsListFilters
  readonly listSort: AdminProductsListSort | undefined
  readonly serverSearch: string
}): AdminProductsExportInput => ({
  categoryId: filters.categoryId,
  collectionId: filters.collectionId,
  createdAt: columnFilters.createdAt,
  inventoryLevel: filters.inventoryLevel,
  minPrice: columnFilters.minPrice,
  search: serverSearch === "" ? undefined : serverSearch,
  sort: listSort,
  status: filters.status,
  totalStock: columnFilters.totalStock,
  variantKind: filters.variantKind,
})
const syncProductsToolbarColumnFilters = (
  statusColumn: ReturnType<Table<DataGridFeatures, Product["adminListItem"]>["getColumn"]>,
  variantKindColumn: ReturnType<Table<DataGridFeatures, Product["adminListItem"]>["getColumn"]>,
  patch: ProductsListFilterPatch | undefined,
): void => {
  if (patch === undefined || "status" in patch) {
    statusColumn?.setFilterValue(patch?.status)
  }
  if (patch === undefined || "variantKind" in patch) {
    variantKindColumn?.setFilterValue(patch?.variantKind)
  }
}
const useProductsApplyFilter = (
  table: Table<DataGridFeatures, Product["adminListItem"]>,
  setFilters: Dispatch<SetStateAction<ProductsListFilters>>,
  setPagination: Dispatch<SetStateAction<PaginationState>>,
) => {
  const statusColumn = table.getColumn(PRODUCT_TABLE_COLUMN_ID.status)
  const variantKindColumn = table.getColumn(PRODUCT_TABLE_COLUMN_ID.variantKind)
  return useCallback(
    (patch?: ProductsListFilterPatch) => {
      setFilters((previous) => applyProductsListFilterPatch(previous, patch))
      syncProductsToolbarColumnFilters(statusColumn, variantKindColumn, patch)
      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }))
    },
    [setFilters, setPagination, statusColumn, variantKindColumn],
  )
}
const useUnfilteredProductsPageSize = (
  table: Table<DataGridFeatures, Product["adminListItem"]>,
  hasServerListQuery: boolean,
  rowCount: number,
): void => {
  const tableRef = useRef(table)
  tableRef.current = table
  useEffect(() => {
    const nextPageSize = hasServerListQuery ? ADMIN_PRODUCTS_PAGE_SIZE : Math.max(rowCount, ADMIN_PRODUCTS_PAGE_SIZE)
    const { pageIndex, pageSize } = tableRef.current.atoms.pagination.get()
    if (pageSize !== nextPageSize) {
      tableRef.current.setPageSize(nextPageSize)
    }
    if (!hasServerListQuery && pageIndex !== 0) {
      tableRef.current.setPageIndex(0)
    }
  }, [hasServerListQuery, rowCount])
}
export const useProductsDataGrid = ({ onRowClick, onRowPointerEnter }: UseProductsDataGridOptions): ProductsDataGridValue => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: ADMIN_PRODUCTS_PAGE_SIZE,
  })
  const [filters, setFilters] = useState<ProductsListFilters>({})
  const [serverSearch, setServerSearch] = useState("")
  const [serverSorting, setServerSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const serverListState = useMemo(
    () => ({
      listColumnFilters: parseAdminProductsListColumnFilters(columnFilters),
      listSort: parseAdminProductsListSort(serverSorting),
    }),
    [columnFilters, serverSorting],
  )
  const hasServerListQuery = hasProductsServerListQuery(filters, serverSearch, serverListState.listColumnFilters)
  const { ordering, pageCount, rowCount, showSkeletonRows, tableData } = useProductsListData({
    columnFilters: serverListState.listColumnFilters,
    filters,
    hasServerListQuery,
    pagination,
    search: serverSearch === "" ? undefined : serverSearch,
    sort: serverListState.listSort,
  })
  const columns = useProductColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: tableData,
    defaultColumnVisibility: PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_PRODUCTS_PAGE_SIZE,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: PRODUCT_TABLE_COLUMN_PINNING,
    manualFiltering: hasServerListQuery,
    manualPagination: hasServerListQuery,
    manualSorting: hasServerListQuery,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: hasServerListQuery ? setPagination : undefined,
    onSortingChange: hasServerListQuery ? setServerSorting : undefined,
    pageCount: hasServerListQuery ? pageCount : undefined,
    pagination: hasServerListQuery ? pagination : undefined,
    persistenceKey: productsDataGrid.persistenceKey,
    rowCount: hasServerListQuery ? rowCount : undefined,
    sorting: hasServerListQuery ? serverSorting : undefined,
  })
  const { debouncedSearch } = useAdminDebouncedTableSearch(table)
  useProductsServerListSync({
    columnFilters,
    debouncedSearch,
    hasServerListQuery,
    serverSorting,
    setPagination,
    setServerSearch,
    setServerSorting,
  })
  const sorting = table.atoms.sorting.get()
  const rowReorder = useProductsRowReorder({
    columnFilters,
    hasServerListQuery,
    ordering,
    sorting,
  })
  useUnfilteredProductsPageSize(table, hasServerListQuery, tableData.length)
  const applyProductsFilter = useProductsApplyFilter(table, setFilters, setPagination)
  return useMemo(
    () => ({
      activeCategoryFilter: filters.categoryId,
      activeCollectionFilter: filters.collectionId,
      activeInventoryFilter: filters.inventoryLevel,
      activeStatusFilter: filters.status,
      activeVariantKindFilter: filters.variantKind,
      applyProductsFilter,
      columnReorder,
      exportListInput: buildProductsExportListInput({
        columnFilters: serverListState.listColumnFilters,
        filters,
        listSort: serverListState.listSort,
        serverSearch,
      }),
      hasPreferenceOverrides,
      hasServerListQuery,
      isLoading: showSkeletonRows,
      onRowClick,
      onRowPointerEnter,
      persistenceKey: productsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("searchPlaceholder"),
      table,
    }),
    [
      applyProductsFilter,
      columnReorder,
      filters,
      hasPreferenceOverrides,
      hasServerListQuery,
      serverListState,
      onRowClick,
      onRowPointerEnter,
      resetPreferences,
      rowReorder,
      serverSearch,
      showSkeletonRows,
      t,
      table,
    ],
  )
}
const isProductsDataGridValue = (value: DataGridContextValue<Product["adminListItem"]>): value is ProductsDataGridValue =>
  "applyProductsFilter" in value && typeof value.applyProductsFilter === "function"

export const useProductsDataGridContext = (): ProductsDataGridValue => {
  const value = productsDataGrid.useDataGrid()
  if (!isProductsDataGridValue(value)) {
    throw new Error("useProductsDataGridContext must be used within the products table Provider.")
  }
  return value
}
export interface ProductsListFilters {
  readonly categoryId?: string
  readonly collectionId?: string
  readonly inventoryLevel?: ProductInventoryLevel
  readonly status?: ProductStatus
  readonly variantKind?: ProductVariantKind
}
export type ProductsListFilterPatch = { readonly [Key in keyof ProductsListFilters]?: ProductsListFilters[Key] | undefined }
type MutableProductsListFilters = { -readonly [Key in keyof ProductsListFilters]: ProductsListFilters[Key] }
const PRODUCTS_LIST_FILTER_PATCH_KEYS = ["categoryId", "collectionId", "inventoryLevel", "status", "variantKind"] as const
export interface ProductsDataGridValue extends DataGridContextValue<Product["adminListItem"]> {
  readonly activeCategoryFilter: string | undefined
  readonly activeCollectionFilter: string | undefined
  readonly activeInventoryFilter: ProductInventoryLevel | undefined
  readonly activeStatusFilter: ProductStatus | undefined
  readonly activeVariantKindFilter: ProductVariantKind | undefined
  readonly applyProductsFilter: (patch?: ProductsListFilterPatch) => void
  readonly exportListInput: AdminProductsExportInput
  readonly hasServerListQuery: boolean
}
interface UseProductsDataGridOptions {
  readonly onRowClick?: (product: Product["adminListItem"]) => void
  readonly onRowPointerEnter?: (product: Product["adminListItem"]) => void
}
