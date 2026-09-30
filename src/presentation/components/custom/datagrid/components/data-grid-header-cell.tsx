import { type CSSProperties, type DragEvent, type JSX, type MouseEvent, type ReactNode, type TouchEvent, useCallback, useMemo } from "react"

import { type Header, type RowData } from "@tanstack/react-table"
import { cn } from "cn"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { TableHead } from "~/src/presentation/components/shadcn/table"

import {
  buildDataGridHeaderCellContent,
  renderDataGridHeaderLabel,
} from "~/src/presentation/components/custom/datagrid/components/data-grid-header-content"
import { useDataGridColumnMetrics } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-column-metrics"
import { buildDataGridCellStyle } from "~/src/presentation/components/custom/datagrid/lib/data-grid-cell-style"
import { createDataGridColumnResizeHandler } from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-resize"
import {
  DATA_GRID_HEADER_CELL_CLASS,
  DATA_GRID_HEADER_CELL_SORTED_CLASS,
  DATA_GRID_HEADER_SORT_BUTTON_CLASS,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-header.styles"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type ColumnReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

interface DataGridHeaderCellProps<TData extends RowData> {
  readonly columnReorder: ColumnReorderApi
  readonly header: Header<DataGridFeatures, TData>
  readonly persistenceKey: string
}

const preventDefault = (event: DragEvent<HTMLTableCellElement>): void => {
  event.preventDefault()
}

const SortIcon = ({ direction }: Readonly<{ direction: false | "asc" | "desc" }>): JSX.Element => {
  if (direction === "asc") {
    return <ArrowUp className="size-3.5" strokeWidth={2} />
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3.5" strokeWidth={2} />
  }

  return <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover/head:opacity-70" strokeWidth={2} />
}

const ColumnReorderHeaderArea = ({
  children,
  columnId,
  columnReorder,
  label,
  leavesRoomForResize,
}: Readonly<{
  children: ReactNode
  columnId: string
  columnReorder: ColumnReorderApi
  label: string
  leavesRoomForResize: boolean
}>): JSX.Element => {
  const t = useTranslations("components.datagrid")

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.stopPropagation()
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", columnId)
      columnReorder.onColumnDragStart(columnId)
    },
    [columnId, columnReorder],
  )

  const handleColumnDragEnd = useCallback(() => {
    columnReorder.onColumnDragEnd()
  }, [columnReorder])

  return (
    <div
      role="group"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleColumnDragEnd}
      aria-label={t("reorderColumn", { column: label })}
      className={cn("m-0 flex min-w-0 flex-1 touch-none items-center border-0 p-0 select-none", {
        "cursor-grab active:cursor-grabbing": true,
        "pr-3": leavesRoomForResize,
      })}
    >
      {children}
    </div>
  )
}

const ColumnResizeHandle = <TData extends RowData>({
  header,
  label,
}: Readonly<{ header: Header<DataGridFeatures, TData>; label: string }>): JSX.Element => {
  const t = useTranslations("components.datagrid")
  const isResizing = header.column.getIsResizing()
  const handleResize = useMemo(() => createDataGridColumnResizeHandler(header), [header])

  const handleResetSize = useCallback(() => {
    header.column.resetSize()
  }, [header])

  const handleResizePointerDown = useCallback(
    (event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      event.preventDefault()
      handleResize(event)
    },
    [handleResize],
  )

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
          "w-px bg-transparent group-hover/resize:bg-foreground/50": !isResizing,
        })}
      />
    </button>
  )
}

export const DataGridHeaderCell = <TData extends RowData>({
  columnReorder,
  header,
  persistenceKey,
}: DataGridHeaderCellProps<TData>): JSX.Element => {
  const t = useTranslations("components.datagrid")
  const { column } = header
  const { table } = header.getContext()
  const { pinLayout, tableLayout, widthPx } = useDataGridColumnMetrics(column, table)
  const isFixedWidth = !column.getCanResize()
  const canDrag = column.getCanHide()
  const label = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id
  const isPinned = column.getIsPinned()
  const isSorted = column.getIsSorted() !== false
  const isLastLeftPinned = isPinned === "start" && column.getIsLastColumn("start")
  const isFirstRightPinned = isPinned === "end" && column.getIsFirstColumn("end")

  const headStyle = useMemo<CSSProperties>(
    () =>
      buildDataGridCellStyle({
        column,
        isPinned,
        layout: tableLayout,
        persistenceKey,
        pinLayout,
        table,
        widthPx,
      }),
    [column, isPinned, persistenceKey, pinLayout, table, tableLayout, widthPx],
  )

  const handleSort = useCallback(
    (event: unknown) => {
      column.getToggleSortingHandler()?.(event)
    },
    [column],
  )

  const handleDragEnter = useCallback(() => {
    columnReorder.onColumnDragOver(column.id)
  }, [column.id, columnReorder])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLTableCellElement>) => {
      event.preventDefault()
      columnReorder.onColumnDragEnd()
    },
    [columnReorder],
  )

  const content = buildDataGridHeaderCellContent({
    column,
    header,
    labelNode: renderDataGridHeaderLabel(header, column),
    onSort: handleSort,
    sortButtonClassName: DATA_GRID_HEADER_SORT_BUTTON_CLASS,
    sortIcon: <SortIcon direction={column.getIsSorted()} />,
    sortLabel: t("sortBy", { column: label }),
  })

  const headClassName = column.columnDef.meta?.headClassName?.replaceAll(/\btext-right\b/gu, "text-left")

  return (
    <TableHead
      onDragEnter={canDrag ? handleDragEnter : undefined}
      onDragOver={canDrag ? preventDefault : undefined}
      onDrop={canDrag ? handleDrop : undefined}
      style={headStyle}
      data-pinned={isPinned === false ? undefined : isPinned}
      className={cn(DATA_GRID_HEADER_CELL_CLASS, isSorted && DATA_GRID_HEADER_CELL_SORTED_CLASS, headClassName, {
        "bg-muted": isPinned !== false && !isSorted,
        "border-r border-border/60": isPinned === "start" && isLastLeftPinned,
        "border-r border-border/60 group-last:border-r-0": isPinned === false,
        "border-r-0 border-l border-border/60": isPinned === "end" && isFirstRightPinned,
        "opacity-40": columnReorder.draggedColumnId === column.id,
        "overflow-hidden": isFixedWidth,
        "sticky top-0 z-30": isPinned !== false,
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
  )
}
