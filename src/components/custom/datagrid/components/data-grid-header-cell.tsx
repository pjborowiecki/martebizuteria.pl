import {
  type CSSProperties,
  type DragEvent,
  type JSX,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
  useCallback,
  useMemo
} from "react";

import { type Header, type RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { TableHead } from "~/src/components/shadcn/table";

import {
  buildDataGridHeaderCellContent,
  renderDataGridHeaderLabel
} from "~/src/components/custom/datagrid/components/data-grid-header-content";
import { useDataGridColumnMetrics } from "~/src/components/custom/datagrid/hooks/use-data-grid-column-metrics";
import { buildDataGridCellStyle } from "~/src/components/custom/datagrid/lib/data-grid-cell-style";
import { createDataGridColumnResizeHandler } from "~/src/components/custom/datagrid/lib/data-grid-column-resize";
import {
  DATA_GRID_HEADER_CELL_CLASS,
  DATA_GRID_HEADER_CELL_SORTED_CLASS,
  DATA_GRID_HEADER_SORT_BUTTON_CLASS
} from "~/src/components/custom/datagrid/lib/data-grid-header.styles";
import type { ColumnReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";

interface DataGridHeaderCellProps<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi;
  readonly header: Header<TData, unknown>;
  readonly persistenceKey: string;
}

function preventDefault(event: DragEvent<HTMLTableCellElement>): void {
  event.preventDefault();
}

function SortIcon({ direction }: Readonly<{ direction: false | "asc" | "desc" }>): JSX.Element {
  if (direction === "asc") {
    return <ArrowUp className="size-3.5" strokeWidth={2} />;
  }
  if (direction === "desc") {
    return <ArrowDown className="size-3.5" strokeWidth={2} />;
  }
  return <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover/head:opacity-70" strokeWidth={2} />;
}

/** Label area: grab cursor on hover for reorder; right padding keeps the resize hit zone clear. */
function ColumnReorderHeaderArea({
  children,
  columnId,
  columnReorder,
  label,
  leavesRoomForResize
}: Readonly<{
  children: ReactNode;
  columnId: string;
  columnReorder: ColumnReorderApi;
  label: string;
  leavesRoomForResize: boolean;
}>): JSX.Element {
  const t = useTranslations("components.datagrid");

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLFieldSetElement>) => {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", columnId);
      columnReorder.onColumnDragStart(columnId);
    },
    [columnId, columnReorder]
  );

  const handleColumnDragEnd = useCallback(() => {
    columnReorder.onColumnDragEnd();
  }, [columnReorder]);

  return (
    <fieldset
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleColumnDragEnd}
      aria-label={t("reorderColumn", { column: label })}
      className={cn("m-0 flex min-w-0 flex-1 touch-none items-center border-0 p-0 select-none", {
        "cursor-grab active:cursor-grabbing": true,
        "pr-3": leavesRoomForResize
      })}
    >
      {children}
    </fieldset>
  );
}

function ColumnResizeHandle<TData extends RowData>({
  header,
  label
}: Readonly<{ header: Header<TData, unknown>; label: string }>): JSX.Element {
  const t = useTranslations("components.datagrid");
  const isResizing = header.column.getIsResizing();
  const handleResize = useMemo(() => createDataGridColumnResizeHandler(header), [header]);

  const handleResetSize = useCallback(() => {
    header.column.resetSize();
  }, [header]);

  const handleResizePointerDown = useCallback(
    (event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      handleResize(event);
    },
    [handleResize]
  );

  return (
    <button
      type="button"
      tabIndex={-1}
      draggable={false}
      onMouseDown={handleResizePointerDown}
      onTouchStart={handleResizePointerDown}
      onDoubleClick={handleResetSize}
      aria-label={t("resizeColumn", { column: label })}
      className="group/resize absolute top-0 -right-1 z-10 flex h-full w-4 cursor-col-resize touch-none justify-center select-none"
    >
      <div
        className={cn("h-full transition-colors", {
          "w-[2px] bg-foreground": isResizing,
          "w-px bg-transparent group-hover/resize:bg-foreground/50": !isResizing
        })}
      />
    </button>
  );
}

export function DataGridHeaderCell<TData extends RowData>({
  columnReorder,
  header,
  persistenceKey
}: DataGridHeaderCellProps<TData>): JSX.Element {
  const t = useTranslations("components.datagrid");
  const { column } = header;
  const { table } = header.getContext();
  const { pinLayout, tableLayout, widthPx } = useDataGridColumnMetrics(column, table);
  const isFixedWidth = !column.getCanResize();
  const canDrag = column.getCanHide();
  const label = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
  const isPinned = column.getIsPinned();
  const isSorted = column.getIsSorted() !== false;
  const isLastLeftPinned = isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinned = isPinned === "right" && column.getIsFirstColumn("right");

  const headStyle = useMemo<CSSProperties>(
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

  const handleSort = useCallback(
    (event: unknown) => {
      column.getToggleSortingHandler()?.(event);
    },
    [column]
  );

  const handleDragEnter = useCallback(() => {
    columnReorder.onColumnDragOver(column.id);
  }, [column.id, columnReorder]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLTableCellElement>) => {
      event.preventDefault();
      columnReorder.onColumnDragEnd();
    },
    [columnReorder]
  );

  const content = buildDataGridHeaderCellContent({
    column,
    header,
    labelNode: renderDataGridHeaderLabel(header, column),
    onSort: handleSort,
    sortButtonClassName: DATA_GRID_HEADER_SORT_BUTTON_CLASS,
    sortIcon: <SortIcon direction={column.getIsSorted()} />,
    sortLabel: t("sortBy", { column: label })
  });

  /** `text-right` on headers clips the label start when the column is narrow; body cells keep alignment via `cellClassName`. */
  const headClassName = column.columnDef.meta?.headClassName?.replaceAll(/\btext-right\b/gu, "text-left");

  return (
    <TableHead
      onDragEnter={canDrag ? handleDragEnter : undefined}
      onDragOver={canDrag ? preventDefault : undefined}
      onDrop={canDrag ? handleDrop : undefined}
      style={headStyle}
      data-pinned={isPinned === false ? undefined : isPinned}
      className={cn(DATA_GRID_HEADER_CELL_CLASS, isSorted && DATA_GRID_HEADER_CELL_SORTED_CLASS, headClassName, {
        "bg-muted": isPinned !== false && !isSorted,
        "border-r border-border/60": isPinned === "left" && isLastLeftPinned,
        "border-r border-border/60 group-last:border-r-0": isPinned === false,
        "border-r-0 border-l border-border/60": isPinned === "right" && isFirstRightPinned,
        "opacity-40": columnReorder.draggedColumnId === column.id,
        "overflow-hidden": isFixedWidth,
        "sticky top-0 z-30": isPinned !== false
      })}
    >
      <div className="flex min-w-0 items-center">
        {canDrag ? (
          <ColumnReorderHeaderArea
            columnId={column.id}
            columnReorder={columnReorder}
            label={label}
            leavesRoomForResize={column.getCanResize()}
          >
            {content}
          </ColumnReorderHeaderArea>
        ) : (
          content
        )}
      </div>
      {column.getCanResize() && <ColumnResizeHandle header={header} label={label} />}
    </TableHead>
  );
}
