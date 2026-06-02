import { useMemo, useState } from "react";

import {
  type ColumnPinningState,
  type ColumnSizingInfoState,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table,
  type TableOptions,
  useReactTable
} from "@tanstack/react-table";

import { useColumnReorder } from "~/src/components/custom/datagrid/hooks/use-column-reorder";
import { useDataGridPreferences } from "~/src/components/custom/datagrid/hooks/use-data-grid-preferences";
import { DEFAULT_COLUMN_SIZING_INFO } from "~/src/components/custom/datagrid/lib/data-grid-column-sizing-info";
import type { ColumnReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { buildDataGridColumnMinSizes, getNonResizableColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";

const FIRST_PAGE_INDEX = 0;
const DEFAULT_PAGE_SIZE = 10;
const MIN_COLUMN_SIZE = 36;

export interface UseDataGridInstanceOptions<TData extends RowData> {
  readonly columns: TableOptions<TData>["columns"];
  readonly data: TData[];
  readonly defaultPageSize?: number;
  readonly enableRowSelection?: boolean;
  readonly getRowId: TableOptions<TData>["getRowId"];
  readonly initialColumnOrder: readonly string[];
  readonly initialColumnPinning?: ColumnPinningState;
  /** Stable id for localStorage (e.g. `admin.catalog.collections`). */
  readonly persistenceKey: string;
}

export interface DataGridInstance<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi;
  readonly hasPreferenceOverrides: boolean;
  readonly resetPreferences: () => void;
  readonly table: Table<TData>;
}

/**
 * Builds a fully-featured TanStack Table instance — sorting, column visibility,
 * column ordering, faceted/column filters, global search, pagination and row
 * selection — wired to local state. Pages supply columns, data and row ids.
 */
export function useDataGridInstance<TData extends RowData>({
  columns,
  data,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  enableRowSelection = true,
  getRowId,
  initialColumnOrder,
  initialColumnPinning,
  persistenceKey
}: UseDataGridInstanceOptions<TData>): DataGridInstance<TData> {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(initialColumnPinning ?? {});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: FIRST_PAGE_INDEX, pageSize: defaultPageSize });
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>(DEFAULT_COLUMN_SIZING_INFO);

  const nonResizableColumnIds = useMemo(() => getNonResizableColumnIds(columns), [columns]);
  const columnMinSizes = useMemo(() => buildDataGridColumnMinSizes(columns), [columns]);

  const preferences = useDataGridPreferences({ columnMinSizes, initialColumnOrder, nonResizableColumnIds, persistenceKey });

  const columnReorder = useColumnReorder({
    columnOrder: preferences.columnOrder,
    setColumnOrder: preferences.setColumnOrder
  });

  const table = useReactTable<TData>({
    columnResizeMode: "onChange",
    columns,
    data,
    defaultColumn: { minSize: MIN_COLUMN_SIZE },
    enableColumnResizing: true,
    enablePinning: true,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: "includesString",
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: preferences.setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: preferences.setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
    onColumnVisibilityChange: preferences.setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnOrder: preferences.columnOrder,
      columnPinning,
      columnSizing: preferences.columnSizing,
      columnSizingInfo,
      columnVisibility: preferences.columnVisibility,
      globalFilter,
      pagination,
      rowSelection,
      sorting
    }
  });

  return {
    columnReorder: columnReorder.api,
    hasPreferenceOverrides: preferences.hasPreferenceOverrides,
    resetPreferences: preferences.resetPreferences,
    table
  };
}
