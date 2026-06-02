import { type CSSProperties, type JSX, useMemo } from "react";

import type { Column, RowData, Table } from "@tanstack/react-table";

import { cn } from "~/src/lib/utils";

import { TableCell, TableRow } from "~/src/components/shadcn/table";

import { useDataGridColumnMetrics } from "~/src/components/custom/datagrid/hooks/use-data-grid-column-metrics";
import { DATA_GRID_BODY_CELL_CLASS, DATA_GRID_BODY_ROW_CLASS } from "~/src/components/custom/datagrid/lib/data-grid-body.styles";
import { buildDataGridCellStyle } from "~/src/components/custom/datagrid/lib/data-grid-cell-style";
import { renderDataGridSkeletonContent } from "~/src/components/custom/datagrid/lib/data-grid-skeleton-content";

interface DataGridSkeletonProps<TData extends RowData> {
  readonly columns: readonly Column<TData>[];
  readonly persistenceKey: string;
  readonly rowCount: number;
  readonly table: Table<TData>;
}

function DataGridSkeletonCell<TData extends RowData>({
  column,
  persistenceKey,
  table
}: Readonly<{ column: Column<TData>; persistenceKey: string; table: Table<TData> }>): JSX.Element {
  const { pinLayout, tableLayout, widthPx } = useDataGridColumnMetrics(column, table);
  const isPinned = column.getIsPinned();
  const isLastLeftPinned = isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinned = isPinned === "right" && column.getIsFirstColumn("right");

  const cellStyle = useMemo<CSSProperties>(
    () =>
      buildDataGridCellStyle({
        column,
        isPinned,
        layout: tableLayout,
        persistenceKey,
        pinLayout,
        table,
        widthPx
      }),
    [column, isPinned, persistenceKey, pinLayout, table, tableLayout, widthPx]
  );

  return (
    <TableCell
      style={cellStyle}
      data-pinned={isPinned === false ? undefined : isPinned}
      className={cn(column.columnDef.meta?.cellClassName, DATA_GRID_BODY_CELL_CLASS, {
        "border-l border-border/60": isPinned === "right" && isFirstRightPinned,
        "border-r border-border/60": isPinned === "left" && isLastLeftPinned,
        "overflow-hidden": !column.getCanResize(),
        "sticky z-10": isPinned !== false
      })}
    >
      {renderDataGridSkeletonContent(column.columnDef.meta?.skeletonVariant)}
    </TableCell>
  );
}

export function DataGridSkeleton<TData extends RowData>({
  columns,
  persistenceKey,
  rowCount,
  table
}: DataGridSkeletonProps<TData>): JSX.Element {
  const rowKeys = useMemo(() => Array.from({ length: rowCount }, () => crypto.randomUUID()), [rowCount]);

  return (
    <>
      {rowKeys.map((rowKey) => (
        <TableRow key={rowKey} className={cn(DATA_GRID_BODY_ROW_CLASS, "hover:bg-transparent [&>td]:align-middle")}>
          {columns.map((column) => (
            <DataGridSkeletonCell key={column.id} column={column} persistenceKey={persistenceKey} table={table} />
          ))}
        </TableRow>
      ))}
    </>
  );
}
