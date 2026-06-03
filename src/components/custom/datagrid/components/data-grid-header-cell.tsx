import { type CSSProperties, type DragEvent, type JSX, useCallback, useMemo } from "react";

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

function ColumnResizeHandle<TData extends RowData>({
  header,
  label
}: Readonly<{ header: Header<TData, unknown>; label: string }>): JSX.Element {
  const t = useTranslations("dataGrid");
  const isResizing = header.column.getIsResizing();
  const handleResize = useMemo(() => createDataGridColumnResizeHandler(header), [header]);

  const handleResetSize = useCallback(() => {
    header.column.resetSize();
  }, [header]);

  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={handleResize}
      onTouchStart={handleResize}
      onDoubleClick={handleResetSize}
      aria-label={t("resizeColumn", { column: label })}
      className="group/resize absolute top-0 -right-1.5 z-10 flex h-full w-3 cursor-col-resize touch-none justify-center select-none"
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
  const t = useTranslations("dataGrid");
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

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLTableCellElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", column.id);
      columnReorder.onColumnDragStart(column.id);
    },
    [column.id, columnReorder]
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

  return (
    <TableHead
      onDragEnter={canDrag ? handleDragEnter : undefined}
      onDragOver={canDrag ? preventDefault : undefined}
      onDrop={canDrag ? handleDrop : undefined}
      style={headStyle}
      data-pinned={isPinned === false ? undefined : isPinned}
      className={cn(DATA_GRID_HEADER_CELL_CLASS, isSorted && DATA_GRID_HEADER_CELL_SORTED_CLASS, column.columnDef.meta?.headClassName, {
        "bg-muted": isPinned !== false && !isSorted,
        "border-r border-border/60": isPinned === "left" && isLastLeftPinned,
        "border-r border-border/60 group-[&:last-child]:border-r-0": isPinned === false,
        "border-r-0 border-l border-border/60": isPinned === "right" && isFirstRightPinned,
        "opacity-40": columnReorder.draggedColumnId === column.id,
        "overflow-hidden": isFixedWidth,
        "sticky z-20": isPinned !== false
      })}
    >
      <div
        draggable={canDrag}
        onDragStart={canDrag ? handleDragStart : undefined}
        onDragEnd={canDrag ? columnReorder.onColumnDragEnd : undefined}
        className={cn("flex items-center", {
          "cursor-grab active:cursor-grabbing": canDrag
        })}
      >
        {content}
      </div>
      {column.getCanResize() && <ColumnResizeHandle header={header} label={label} />}
    </TableHead>
  );
}
