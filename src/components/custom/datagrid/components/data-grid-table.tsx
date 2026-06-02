import { type JSX, useMemo, useRef } from "react";

import type { RowData, Table } from "@tanstack/react-table";

import { cn } from "~/src/lib/utils";

import { DataTable, DataTableContainer, dataTableContentStyle } from "~/src/components/shadcn/data-table";
import { TableBody, TableCell, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { DataGridHeaderCell } from "~/src/components/custom/datagrid/components/data-grid-header-cell";
import { DataGridLayoutProvider } from "~/src/components/custom/datagrid/components/data-grid-layout-context";
import { DataGridRow } from "~/src/components/custom/datagrid/components/data-grid-row";
import { DataGridSkeleton } from "~/src/components/custom/datagrid/components/data-grid-skeleton";
import { useDatagridContainerWidth } from "~/src/components/custom/datagrid/hooks/use-datagrid-table-layout";
import { buildDataGridColumnWidthStyle } from "~/src/components/custom/datagrid/lib/data-grid-column-width";
import { DATA_GRID_HEADER_ROW_CLASS } from "~/src/components/custom/datagrid/lib/data-grid-header.styles";
import {
  getDataGridColumnLayoutWidth,
  getDataGridContentWidth,
  getDataGridTableMinWidth,
  resolveDataGridTableLayout
} from "~/src/components/custom/datagrid/lib/data-grid-table-layout";
import type { ColumnReorderApi, RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";

const NO_ROWS = 0;
const MAX_SKELETON_ROWS = 5;
const UNMEASURED_CONTAINER_WIDTH = 0;
interface DataGridTableProps<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi;
  readonly emptyMessage: string;
  readonly isLoading: boolean;
  readonly onRowClick?: (row: TData) => void;
  readonly persistenceKey: string;
  readonly rowReorder: RowReorderApi | undefined;
  readonly table: Table<TData>;
}

export function DataGridTable<TData extends RowData>({
  columnReorder,
  emptyMessage,
  isLoading,
  onRowClick,
  persistenceKey,
  rowReorder,
  table
}: DataGridTableProps<TData>): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnCount = visibleColumns.length;
  const { columnSizing } = table.getState();

  const tableMinWidth = useMemo(() => getDataGridTableMinWidth(visibleColumns, columnSizing), [columnSizing, visibleColumns]);
  const layoutKey = tableMinWidth + visibleColumnCount;
  const tableClientWidth = useDatagridContainerWidth(containerRef, layoutKey);

  const hasMeasuredContainer = tableClientWidth > UNMEASURED_CONTAINER_WIDTH;

  const tableLayout = useMemo(
    () => (hasMeasuredContainer ? resolveDataGridTableLayout({ columnSizing, columns: visibleColumns, tableClientWidth }) : undefined),
    [columnSizing, hasMeasuredContainer, tableClientWidth, visibleColumns]
  );

  const tableWidth = useMemo(
    () => getDataGridContentWidth({ columnSizing, columns: visibleColumns, tableClientWidth }),
    [columnSizing, tableClientWidth, visibleColumns]
  );

  const tableStyle = useMemo(
    () => dataTableContentStyle({ containerWidthPx: tableClientWidth, layoutWidthPx: tableWidth, minWidthPx: tableMinWidth }),
    [tableClientWidth, tableMinWidth, tableWidth]
  );
  const layoutValue = useMemo(() => ({ tableClientWidth, tableLayout, tableWidth }), [tableClientWidth, tableLayout, tableWidth]);

  const skeletonRowCount = Math.min(table.getState().pagination.pageSize, MAX_SKELETON_ROWS);

  const tableBody = useMemo(() => {
    if (isLoading) {
      return <DataGridSkeleton rowCount={skeletonRowCount} columns={visibleColumns} persistenceKey={persistenceKey} table={table} />;
    }

    if (rows.length === NO_ROWS) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={visibleColumnCount} className="h-24 border-b border-border/60 text-center text-muted-foreground">
            {emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => (
      <DataGridRow key={row.id} row={row} rowReorder={rowReorder} persistenceKey={persistenceKey} onRowClick={onRowClick} />
    ));
  }, [emptyMessage, isLoading, onRowClick, persistenceKey, rowReorder, rows, skeletonRowCount, table, visibleColumnCount, visibleColumns]);

  return (
    <DataGridLayoutProvider value={layoutValue}>
      <DataTableContainer ref={containerRef}>
        <DataTable className="w-full" style={tableStyle}>
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                style={buildDataGridColumnWidthStyle({
                  column,
                  layout: tableLayout,
                  persistenceKey,
                  widthPx: getDataGridColumnLayoutWidth(column, columnSizing, tableLayout)
                })}
              />
            ))}
          </colgroup>
          <TableHeader className="bg-muted [&_tr]:border-border/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={cn(DATA_GRID_HEADER_ROW_CLASS, String.raw`[&>th:last-child>button.group\/resize]:hidden`)}
              >
                {headerGroup.headers.map((header) => (
                  <DataGridHeaderCell key={header.id} header={header} columnReorder={columnReorder} persistenceKey={persistenceKey} />
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&_tr:last-child>td]:border-b-0">{tableBody}</TableBody>
        </DataTable>
      </DataTableContainer>
    </DataGridLayoutProvider>
  );
}
