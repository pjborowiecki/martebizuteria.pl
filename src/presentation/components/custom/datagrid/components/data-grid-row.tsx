import { type CSSProperties, type DragEvent, type JSX, type MouseEvent, type ReactNode, useCallback } from "react"

import { type Cell, type Column, type Row, type RowData, type Table, flexRender } from "@tanstack/react-table"
import { cn } from "cn"

import { TableCell, TableRow } from "~/src/presentation/components/shadcn/table"

import { useDataGridColumnMetrics } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-column-metrics"
import { buildDataGridCellStyle } from "~/src/presentation/components/custom/datagrid/lib/data-grid-cell-style"
import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { type RowReorderApi } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridLayoutColumns } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

export const DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT = 5

export const DATA_GRID_EMPTY_MESSAGE_ROW_INDEX = 2

export const DATA_GRID_PLACEHOLDER_CELL_INNER_CLASS = "box-border flex h-9 w-full min-w-0 shrink-0 items-center"

export const DATA_GRID_BODY_CELL_CLASS = cn(
  "border-b border-border/60 bg-card transition-colors group-hover:bg-muted group-data-[state=selected]:bg-muted",
)

export const DATA_GRID_BODY_ROW_CLASS = cn("group border-border/50 transition-colors")

export const DATA_GRID_PLACEHOLDER_BODY_ROW_CLASS = cn(DATA_GRID_BODY_ROW_CLASS, "border-b-0 hover:bg-transparent [&>td]:align-middle")

export const DATA_GRID_PLACEHOLDER_BODY_CELL_CLASS = cn(DATA_GRID_BODY_CELL_CLASS, "border-b-0 group-hover:bg-card hover:bg-card")

interface DataGridRowProps<TData extends RowData> {
  readonly onRowClick?: ((row: TData) => void) | undefined
  readonly onRowPointerEnter?: ((row: TData) => void) | undefined
  readonly persistenceKey: string
  readonly row: Row<DataGridFeatures, TData>
  readonly rowReorder: RowReorderApi | undefined
  readonly table: Table<DataGridFeatures, TData>
}

const DataGridLayoutCell = <TData extends RowData>({
  children,
  column,
  persistenceKey,
  table,
}: Readonly<{
  children?: ReactNode
  column: Column<DataGridFeatures, TData>
  persistenceKey: string
  table: Table<DataGridFeatures, TData>
}>): JSX.Element => {
  const { pinLayout, tableLayout, widthPx } = useDataGridColumnMetrics(column, table)
  const isPinned = column.getIsPinned()
  const isLastLeftPinned = isPinned === "start" && column.getIsLastColumn("start")
  const isFirstRightPinned = isPinned === "end" && column.getIsFirstColumn("end")

  const cellStyle: CSSProperties = buildDataGridCellStyle({
    column,
    isPinned,
    layout: tableLayout,
    persistenceKey,
    pinLayout,
    table,
    widthPx,
  })

  return (
    <TableCell
      style={cellStyle}
      data-pinned={isPinned === false ? undefined : isPinned}
      data-prevent-row-click={column.columnDef.meta?.preventRowClick === true ? true : undefined}
      className={cn(column.columnDef.meta?.cellClassName, DATA_GRID_BODY_CELL_CLASS, {
        "border-l border-border/60": isPinned === "end" && isFirstRightPinned,
        "border-r border-border/60": isPinned === "start" && isLastLeftPinned,
        "overflow-hidden": !column.getCanResize(),
        "sticky z-10": isPinned !== false,
      })}
    >
      {children}
    </TableCell>
  )
}

const DataGridCell = <TData extends RowData>({
  cell,
  persistenceKey,
}: Readonly<{ cell: Cell<DataGridFeatures, TData>; persistenceKey: string }>): JSX.Element => {
  const { column } = cell
  const { table } = cell.getContext()

  return (
    <DataGridLayoutCell column={column} persistenceKey={persistenceKey} table={table}>
      {flexRender(column.columnDef.cell, cell.getContext())}
    </DataGridLayoutCell>
  )
}

export const DataGridRow = <TData extends RowData>({
  onRowClick,
  onRowPointerEnter,
  persistenceKey,
  row,
  rowReorder,
  table,
}: DataGridRowProps<TData>): JSX.Element => {
  const reorderEnabled = rowReorder?.enabled === true
  const isDragging = rowReorder?.draggingId === row.id
  const layoutColumns = getDataGridLayoutColumns(table)
  const cellsByColumnId = row.getAllCellsByColumnId()

  const handleDragEnter = useCallback(() => {
    rowReorder?.onRowDragEnter(row.id)
  }, [rowReorder, row.id])

  const handleDragOver = useCallback((event: DragEvent<HTMLTableRowElement>) => {
    event.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLTableRowElement>) => {
      event.preventDefault()
      rowReorder?.onRowDrop()
    },
    [rowReorder],
  )

  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>) => {
      if (onRowClick === undefined || consumeDataGridRowClickSuppression()) {
        return
      }

      const { target } = event
      if (target instanceof Element && target.closest("[data-prevent-row-click]") !== null) {
        return
      }
      onRowClick(row.original)
    },
    [onRowClick, row.original],
  )

  const handleRowPointerEnter = useCallback(() => {
    onRowPointerEnter?.(row.original)
  }, [onRowPointerEnter, row.original])

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
        "opacity-40": isDragging,
      })}
    >
      {layoutColumns.map((column) => {
        const cell = cellsByColumnId[column.id]
        if (cell === undefined) {
          return <DataGridLayoutCell key={column.id} column={column} persistenceKey={persistenceKey} table={table} />
        }

        return <DataGridCell key={cell.id} cell={cell} persistenceKey={persistenceKey} />
      })}
    </TableRow>
  )
}
