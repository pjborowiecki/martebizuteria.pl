import { useMemo, useState } from "react"

import {
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnVisibilityState,
  type FilterFn,
  type PaginationState,
  type RowData,
  type SortingState,
  type Table,
  type TableOptions,
  useTable,
} from "@tanstack/react-table"

import { useColumnReorder } from "~/src/presentation/components/custom/datagrid/hooks/use-column-reorder"
import { useDataGridPreferences } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-preferences"
import {
  DATA_GRID_DEFAULT_PAGE_SIZE,
  normalizeDataGridPageSize,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-pagination.constants"
import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type ColumnReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import {
  buildDataGridColumnMaxSizes,
  buildDataGridColumnMinSizes,
  getNonResizableColumnIds,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

const MIN_COLUMN_SIZE = 36

export interface UseDataGridInstanceOptions<TData extends RowData> {
  readonly columns: TableOptions<DataGridFeatures, TData>["columns"]
  readonly data: TData[]
  readonly defaultPageSize?: number
  readonly enableRowSelection?: boolean
  readonly getRowId: NonNullable<TableOptions<DataGridFeatures, TData>["getRowId"]>
  readonly initialColumnOrder: readonly string[]
  readonly initialColumnPinning?: ColumnPinningState
  readonly defaultColumnVisibility?: ColumnVisibilityState
  readonly forcedHiddenColumnIds?: readonly string[]
  readonly persistenceKey: string
  readonly globalFilterFn?: FilterFn<DataGridFeatures, TData>
  readonly manualFiltering?: boolean
  readonly manualPagination?: boolean
  readonly manualSorting?: boolean
  readonly onColumnFiltersChange?: (filters: ColumnFiltersState) => void
  readonly onPaginationChange?: ((updater: PaginationState | ((previous: PaginationState) => PaginationState)) => void) | undefined
  readonly onSortingChange?: ((sorting: SortingState) => void) | undefined
  readonly pageCount?: number | undefined
  readonly pagination?: PaginationState | undefined
  readonly rowCount?: number | undefined
  readonly sorting?: SortingState | undefined
}

export interface DataGridInstance<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi
  readonly hasPreferenceOverrides: boolean
  readonly resetPreferences: () => void
  readonly table: Table<DataGridFeatures, TData>
}

export const useDataGridInstance = <TData extends RowData>({
  columns,
  data,
  defaultPageSize = DATA_GRID_DEFAULT_PAGE_SIZE,
  enableRowSelection = true,
  getRowId,
  initialColumnOrder,
  initialColumnPinning,
  defaultColumnVisibility,
  forcedHiddenColumnIds,
  persistenceKey,
  globalFilterFn,
  manualFiltering = false,
  manualPagination = false,
  manualSorting = false,
  onColumnFiltersChange,
  onPaginationChange,
  onSortingChange,
  pageCount,
  pagination: controlledPagination,
  rowCount,
  sorting: controlledSorting,
}: UseDataGridInstanceOptions<TData>): DataGridInstance<TData> => {
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const sorting = controlledSorting ?? internalSorting
  const setSorting = onSortingChange ?? setInternalSorting
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: normalizeDataGridPageSize(defaultPageSize),
  })

  const pagination = controlledPagination ?? internalPagination
  const setPagination = onPaginationChange ?? setInternalPagination

  const nonResizableColumnIds = useMemo(() => getNonResizableColumnIds(columns), [columns])
  const columnMinSizes = useMemo(() => buildDataGridColumnMinSizes(columns), [columns])
  const columnMaxSizes = useMemo(() => buildDataGridColumnMaxSizes(columns), [columns])

  const preferences = useDataGridPreferences({
    columnMaxSizes,
    columnMinSizes,
    columnPinning: initialColumnPinning,
    defaultColumnVisibility,
    forcedHiddenColumnIds,
    initialColumnOrder,
    nonResizableColumnIds,
    persistenceKey,
  })

  const columnReorder = useColumnReorder({
    columnOrder: preferences.columnOrder,
    setColumnOrder: preferences.setColumnOrder,
  })

  const table = useTable<DataGridFeatures, TData>({
    columnResizeMode: "onChange",
    columns,
    data,
    defaultColumn: { minSize: MIN_COLUMN_SIZE },
    enableColumnPinning: true,
    enableColumnResizing: true,
    enableRowSelection,
    features: dataGridFeatures,
    getRowId,
    globalFilterFn: globalFilterFn ?? "includesString",
    initialState: initialColumnPinning === undefined ? {} : { columnPinning: initialColumnPinning },
    manualFiltering,
    manualPagination,
    manualSorting,
    onColumnFiltersChange: (updater) => {
      setColumnFilters((previous) => {
        const next = typeof updater === "function" ? updater(previous) : updater
        onColumnFiltersChange?.(next)

        return next
      })
    },
    onColumnOrderChange: preferences.setColumnOrder,
    onColumnSizingChange: preferences.setColumnSizing,
    onColumnVisibilityChange: preferences.setColumnVisibility,
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(typeof updater === "function" ? updater(sorting) : updater)
    },
    ...(pageCount === undefined ? {} : { pageCount }),
    ...(rowCount === undefined ? {} : { rowCount }),
    state: {
      columnFilters,
      columnOrder: preferences.columnOrder,
      columnSizing: preferences.columnSizing,
      columnVisibility: preferences.columnVisibility,
      pagination,
      sorting,
    },
  })

  return {
    columnReorder: columnReorder.api,
    hasPreferenceOverrides: preferences.hasPreferenceOverrides,
    resetPreferences: preferences.resetPreferences,
    table,
  }
}
