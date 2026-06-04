import { type CSSProperties, type DragEvent, type JSX, type MouseEvent, type ReactNode, useCallback, useMemo } from "react";

import { type Cell, type Column, flexRender, type Row, type RowData, type Table } from "@tanstack/react-table";

import { cn } from "~/src/lib/utils";

import { TableCell, TableRow } from "~/src/components/shadcn/table";

import { useDataGridColumnMetrics } from "~/src/components/custom/datagrid/hooks/use-data-grid-column-metrics";
import { useDataGridLayoutColumns } from "~/src/components/custom/datagrid/hooks/use-data-grid-layout-columns";
import { buildDataGridCellStyle } from "~/src/components/custom/datagrid/lib/data-grid-cell-style";
import { consumeDataGridRowClickSuppression } from "~/src/components/custom/datagrid/lib/data-grid-row-click";
import type { RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";

/** Skeleton / empty placeholder row count when the grid has no data. */
export const DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT = 5;

/** Center row index for the empty-state message when {@link DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT} is 5. */
export const DATA_GRID_EMPTY_MESSAGE_ROW_INDEX = 2;

/** Fixed inner height for placeholder rows (`p-2` + `h-9` ⇒ 52px row — `min-h` on `<td>` is ignored). */
export const DATA_GRID_PLACEHOLDER_CELL_INNER_CLASS = "box-border flex h-9 w-full min-w-0 shrink-0 items-center";

/** Locks tbody height when the grid has no rows (5 × 52px). */
export const DATA_GRID_PLACEHOLDER_TBODY_CLASS = "min-h-[260px]";

export const DATA_GRID_BODY_CELL_CLASS = cn(
  "border-b border-border/60 bg-card transition-colors group-hover:bg-muted group-data-[state=selected]:bg-muted"
);

/** Shared with {@link DataGridSkeleton} and {@link DataGridEmptyRow}. */
export const DATA_GRID_BODY_ROW_CLASS = cn("group border-border/50 transition-colors");

/** Placeholder rows (empty + zero-row skeleton) — no row hover tint on cells. */
export const DATA_GRID_PLACEHOLDER_BODY_ROW_CLASS = cn(DATA_GRID_BODY_ROW_CLASS, "border-b-0 hover:bg-transparent [&>td]:align-middle");

/** Overrides {@link DATA_GRID_BODY_CELL_CLASS} group-hover so imaginary rows stay flat. */
export const DATA_GRID_PLACEHOLDER_BODY_CELL_CLASS = cn(DATA_GRID_BODY_CELL_CLASS, "border-b-0 group-hover:bg-card hover:bg-card");

interface DataGridRowProps<TData extends RowData> {
  readonly onRowClick?: (row: TData) => void;
  readonly onRowPointerEnter?: (row: TData) => void;
  readonly persistenceKey: string;
  readonly row: Row<TData>;
  readonly rowReorder: RowReorderApi | undefined;
  readonly table: Table<TData>;
}

function DataGridLayoutCell<TData extends RowData>({
  children,
  column,
  persistenceKey,
  table
}: Readonly<{ children?: ReactNode; column: Column<TData>; persistenceKey: string; table: Table<TData> }>): JSX.Element {
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
      data-prevent-row-click={column.columnDef.meta?.preventRowClick === true ? true : undefined}
      className={cn(column.columnDef.meta?.cellClassName, DATA_GRID_BODY_CELL_CLASS, {
        "border-l border-border/60": isPinned === "right" && isFirstRightPinned,
        "border-r border-border/60": isPinned === "left" && isLastLeftPinned,
        "overflow-hidden": !column.getCanResize(),
        "sticky z-10": isPinned !== false
      })}
    >
      {children}
    </TableCell>
  );
}

function DataGridCell<TData extends RowData>({
  cell,
  persistenceKey
}: Readonly<{ cell: Cell<TData, unknown>; persistenceKey: string }>): JSX.Element {
  const { column } = cell;
  const { table } = cell.getContext();

  return (
    <DataGridLayoutCell column={column} persistenceKey={persistenceKey} table={table}>
      {flexRender(column.columnDef.cell, cell.getContext())}
    </DataGridLayoutCell>
  );
}

export function DataGridRow<TData extends RowData>({
  onRowClick,
  onRowPointerEnter,
  persistenceKey,
  row,
  rowReorder,
  table
}: DataGridRowProps<TData>): JSX.Element {
  const reorderEnabled = rowReorder?.enabled === true;
  const isDragging = rowReorder?.draggingId === row.id;
  const layoutColumns = useDataGridLayoutColumns(table);
  const cellsByColumnId = useMemo(() => new Map(row.getAllCells().map((cell) => [cell.column.id, cell])), [row]);

  const handleDragEnter = useCallback(() => {
    if (reorderEnabled) {
      rowReorder?.onRowDragEnter(row.id);
    }
  }, [reorderEnabled, rowReorder, row.id]);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLTableRowElement>) => {
      if (reorderEnabled) {
        event.preventDefault();
      }
    },
    [reorderEnabled]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLTableRowElement>) => {
      event.preventDefault();
      rowReorder?.onRowDrop();
    },
    [rowReorder]
  );

  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>) => {
      if (onRowClick === undefined || consumeDataGridRowClickSuppression()) {
        return;
      }
      const { target } = event;
      if (target instanceof Element && target.closest("[data-prevent-row-click]") !== null) {
        return;
      }
      onRowClick(row.original);
    },
    [onRowClick, row.original]
  );

  const handleRowPointerEnter = useCallback(() => {
    onRowPointerEnter?.(row.original);
  }, [onRowPointerEnter, row.original]);

  return (
    <TableRow
      data-dragging={isDragging || undefined}
      data-state={row.getIsSelected() ? "selected" : undefined}
      onClick={onRowClick === undefined ? undefined : handleRowClick}
      onPointerEnter={onRowPointerEnter === undefined ? undefined : handleRowPointerEnter}
      onDragEnter={reorderEnabled ? handleDragEnter : undefined}
      onDragOver={reorderEnabled ? handleDragOver : undefined}
      onDrop={reorderEnabled ? handleDrop : undefined}
      className={cn(DATA_GRID_BODY_ROW_CLASS, {
        "cursor-pointer": onRowClick !== undefined,
        "opacity-40": isDragging
      })}
    >
      {layoutColumns.map((column) => {
        const cell = cellsByColumnId.get(column.id);
        if (cell === undefined) {
          return <DataGridLayoutCell key={column.id} column={column} persistenceKey={persistenceKey} table={table} />;
        }
        return <DataGridCell key={cell.id} cell={cell} persistenceKey={persistenceKey} />;
      })}
    </TableRow>
  );
}
