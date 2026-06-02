import { type CSSProperties, type DragEvent, type JSX, type MouseEvent, useCallback, useMemo } from "react";

import { type Cell, flexRender, type Row, type RowData } from "@tanstack/react-table";

import { cn } from "~/src/lib/utils";

import { TableCell, TableRow } from "~/src/components/shadcn/table";

import { useDataGridColumnMetrics } from "~/src/components/custom/datagrid/hooks/use-data-grid-column-metrics";
import { DATA_GRID_BODY_CELL_CLASS, DATA_GRID_BODY_ROW_CLASS } from "~/src/components/custom/datagrid/lib/data-grid-body.styles";
import { buildDataGridCellStyle } from "~/src/components/custom/datagrid/lib/data-grid-cell-style";
import { consumeDataGridRowClickSuppression } from "~/src/components/custom/datagrid/lib/data-grid-row-click";
import type { RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";

interface DataGridRowProps<TData extends RowData> {
  readonly onRowClick?: (row: TData) => void;
  readonly persistenceKey: string;
  readonly row: Row<TData>;
  readonly rowReorder: RowReorderApi | undefined;
}

function DataGridCell<TData extends RowData>({
  cell,
  persistenceKey
}: Readonly<{ cell: Cell<TData, unknown>; persistenceKey: string }>): JSX.Element {
  const { column } = cell;
  const { table } = cell.getContext();
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
      {flexRender(column.columnDef.cell, cell.getContext())}
    </TableCell>
  );
}

export function DataGridRow<TData extends RowData>({ onRowClick, persistenceKey, row, rowReorder }: DataGridRowProps<TData>): JSX.Element {
  const reorderEnabled = rowReorder?.enabled === true;
  const isDragging = rowReorder?.draggingId === row.id;

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

  return (
    <TableRow
      data-dragging={isDragging || undefined}
      data-state={row.getIsSelected() ? "selected" : undefined}
      onClick={onRowClick === undefined ? undefined : handleRowClick}
      onDragEnter={reorderEnabled ? handleDragEnter : undefined}
      onDragOver={reorderEnabled ? handleDragOver : undefined}
      onDrop={reorderEnabled ? handleDrop : undefined}
      className={cn(DATA_GRID_BODY_ROW_CLASS, {
        "cursor-pointer": onRowClick !== undefined,
        "opacity-40": isDragging
      })}
    >
      {row.getVisibleCells().map((cell) => (
        <DataGridCell key={cell.id} cell={cell} persistenceKey={persistenceKey} />
      ))}
    </TableRow>
  );
}
