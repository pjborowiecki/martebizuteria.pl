import { type Column, type ColumnDef, type ColumnSizingState, type Header, type RowData, type Table } from "@tanstack/react-table"

import {
  type DataGridTableLayout,
  getDataGridColumnLayoutWidth,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

const NOT_FOUND_INDEX = -1

const DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX = 720
const FILL_COLUMN_MAX_WIDTH_MULTIPLIER = 2.5

/** Column ids that must never receive persisted/CSS-var widths (shared across admin datagrids). */
export const DATAGRID_UTILITY_COLUMN_IDS = ["actions", "drag", "image", "select"] as const

/** Column def fragment for utility columns (checkbox, drag, actions) that must not resize. */
export const fixedDataGridColumnWidth = (size: number) => ({
  enableResizing: false as const,
  maxSize: size,
  minSize: size,
  size,
})

const getColumnDefId = <TData extends RowData>(column: ColumnDef<DataGridFeatures, TData>): string | undefined => {
  if (typeof column.id === "string") {
    return column.id
  }
  const accessorKey = "accessorKey" in column && typeof column.accessorKey === "string" ? column.accessorKey : undefined
  return accessorKey
}

const columnDefAbsorbsTrailingSlack = <TData extends RowData>(column: ColumnDef<DataGridFeatures, TData>): boolean =>
  column.meta?.absorbsTrailingSlack === true

/** Ids of columns excluded from persisted sizing (fixed utility + slack absorber). */
export const getNonResizableColumnIds = <TData extends RowData>(columns: readonly ColumnDef<DataGridFeatures, TData>[]): string[] =>
  columns.flatMap((column) => {
    const id = getColumnDefId(column)
    if (id === undefined) {
      return []
    }
    if (column.enableResizing === false || columnDefAbsorbsTrailingSlack(column)) {
      return [id]
    }
    return []
  })

/** Per-column minimum widths for clamping persisted sizing (resizable columns only). */
export const buildDataGridColumnMinSizes = <TData extends RowData>(
  columns: readonly ColumnDef<DataGridFeatures, TData>[],
): Record<string, number> =>
  columns.reduce<Record<string, number>>((next, column) => {
    if (column.enableResizing === false) {
      return next
    }
    const id = getColumnDefId(column)
    const { minSize } = column
    if (id !== undefined && typeof minSize === "number" && Number.isFinite(minSize)) {
      next[id] = minSize
    }
    return next
  }, {})

const readColumnDefMaxWidth = <TData extends RowData>(column: ColumnDef<DataGridFeatures, TData>): number | undefined => {
  const { maxSize, minSize, size } = column
  if (typeof maxSize === "number" && Number.isFinite(maxSize)) {
    return maxSize
  }
  if (typeof size === "number" && Number.isFinite(size)) {
    const expanded = Math.round(size * FILL_COLUMN_MAX_WIDTH_MULTIPLIER)
    const floor = typeof minSize === "number" && Number.isFinite(minSize) ? minSize : size
    return Math.min(Math.max(expanded, floor), DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX)
  }
  return DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX
}

/** Per-column maximum widths for clamping persisted sizing and CSS vars (resizable columns only). */
export const buildDataGridColumnMaxSizes = <TData extends RowData>(
  columns: readonly ColumnDef<DataGridFeatures, TData>[],
): Record<string, number> =>
  columns.reduce<Record<string, number>>((next, column) => {
    if (column.enableResizing === false) {
      return next
    }
    const id = getColumnDefId(column)
    const maxWidth = readColumnDefMaxWidth(column)
    if (id !== undefined && maxWidth !== undefined) {
      next[id] = maxWidth
    }
    return next
  }, {})

export const clampDataGridColumnSizingToMins = (
  sizing: ColumnSizingState,
  columnMinSizes: Readonly<Record<string, number>>,
): ColumnSizingState => {
  const next: ColumnSizingState = { ...sizing }

  for (const [id, minSize] of Object.entries(columnMinSizes)) {
    const size = next[id]
    if (typeof size === "number" && Number.isFinite(size) && size < minSize) {
      next[id] = minSize
    }
  }

  return next
}

export const clampDataGridColumnSizingToMaxes = (
  sizing: ColumnSizingState,
  columnMaxSizes: Readonly<Record<string, number>> = {},
  fallbackMaxWidthPx: number = DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX,
): ColumnSizingState => {
  const next: ColumnSizingState = { ...sizing }

  for (const [id, size] of Object.entries(next)) {
    if (typeof size === "number" && Number.isFinite(size)) {
      const maxSize = columnMaxSizes[id] ?? fallbackMaxWidthPx
      if (size > maxSize) {
        next[id] = maxSize
      }
    }
  }

  return next
}

export const clampDataGridColumnSizing = (
  sizing: ColumnSizingState,
  columnMinSizes: Readonly<Record<string, number>>,
  columnMaxSizes: Readonly<Record<string, number>> = {},
): ColumnSizingState => clampDataGridColumnSizingToMaxes(clampDataGridColumnSizingToMins(sizing, columnMinSizes), columnMaxSizes)

export const measureDataGridContainerWidth = (event: Event): number => {
  const { target } = event
  if (!(target instanceof Element)) {
    return 0
  }
  const container = target.closest("[data-slot='data-table-container']")
  return container instanceof HTMLElement ? container.clientWidth : 0
}

/** Drops sizing entries for utility columns so localStorage cannot widen checkboxes/actions. */
export const omitNonResizableColumnSizing = (sizing: ColumnSizingState, nonResizableColumnIds: readonly string[]): ColumnSizingState => {
  const fixed = new Set(nonResizableColumnIds)
  const next: ColumnSizingState = {}

  for (const [id, size] of Object.entries(sizing)) {
    if (!fixed.has(id)) {
      next[id] = size
    }
  }

  return next
}

/**
 * Leaf header row used for `<colgroup>`, `<th>`, and `<td>` (left → center → right).
 * Prefer the deepest header group and skip placeholders so column add/remove cannot desync layout.
 */
export const getDataGridLayoutHeaders = <TData extends RowData>(
  table: Table<DataGridFeatures, TData>,
): Header<DataGridFeatures, TData>[] => {
  const leafGroup = table.getHeaderGroups().at(-1)
  if (!leafGroup) {
    return []
  }
  return leafGroup.headers.filter(
    (header) => !header.isPlaceholder && header.column.getIsVisible() && header.column.columnDef.meta?.filterOnly !== true,
  )
}

export const getDataGridLayoutColumns = <TData extends RowData>(
  table: Table<DataGridFeatures, TData>,
): Column<DataGridFeatures, TData>[] => {
  const headers = getDataGridLayoutHeaders(table)
  if (headers.length === 0) {
    return table.getVisibleLeafColumns().filter((column) => column.columnDef.meta?.filterOnly !== true)
  }
  return headers.map((header) => header.column)
}

/** Minimal column shape for reading declaration order ids (avoids TanStack `ColumnDef` TValue variance). */
type DataGridColumnIdSource = Readonly<{
  accessorKey?: string | number | symbol
  id?: string
}>

/** Default column order from a `columns` array (declaration order in the column defs). */
export const getDataGridColumnIds = (columns: readonly DataGridColumnIdSource[]): string[] =>
  columns.flatMap((column) => {
    if (typeof column.id === "string") {
      return [column.id]
    }
    const accessorKey = "accessorKey" in column && typeof column.accessorKey === "string" ? column.accessorKey : undefined
    return accessorKey === undefined ? [] : [accessorKey]
  })

/** Returns a new id list with `draggedId` moved into the slot held by `overId`. */
export const reorderColumnOrder = (order: readonly string[], draggedId: string, overId: string): string[] => {
  if (draggedId === overId) {
    return [...order]
  }

  const from = order.indexOf(draggedId)
  const to = order.indexOf(overId)
  if (from === NOT_FOUND_INDEX || to === NOT_FOUND_INDEX) {
    return [...order]
  }

  const next = [...order]
  next.splice(from, 1)
  next.splice(to, 0, draggedId)
  return next
}

/** Returns a new list with the `draggingId` item moved to the position of `overId`. */
export const moveItemBefore = <TItem extends { id: string }>(list: readonly TItem[], draggingId: string, overId: string): TItem[] => {
  if (draggingId === overId) {
    return [...list]
  }

  const from = list.findIndex((item) => item.id === draggingId)
  const to = list.findIndex((item) => item.id === overId)
  const moved = list[from]
  if (moved === undefined || to === NOT_FOUND_INDEX) {
    return [...list]
  }

  const next = [...list]
  next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Returns a new list with the item at `index` swapped with `target`, if in range. */
export const swapItems = <TItem extends { id: string }>(list: readonly TItem[], index: number, target: number): TItem[] => {
  const source = list[index]
  const destination = list[target]
  if (source === undefined || destination === undefined) {
    return [...list]
  }

  const next = [...list]
  next[index] = destination
  next[target] = source
  return next
}

/** Shallow, order-sensitive equality between two id lists. */
export const sameOrder = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index])

export interface DataGridPinOffsetInput<TData extends RowData> {
  readonly column: Column<DataGridFeatures, TData>
  readonly columnSizing: ColumnSizingState
  readonly isPinned: false | "start" | "end"
  readonly pinLayout?: DataGridPinLayout
  readonly table: Table<DataGridFeatures, TData>
  readonly tableLayout?: DataGridTableLayout | undefined
}

export interface DataGridPinLayout {
  readonly tableClientWidth: number
  readonly tableWidth: number
}

export const getDataGridRightPinnedScrollPaddingPx = <TData extends RowData>(
  layoutColumns: readonly Column<DataGridFeatures, TData>[],
  columnSizing: ColumnSizingState,
  tableLayout: DataGridTableLayout | undefined,
): number =>
  layoutColumns.reduce((sum, column) => {
    if (column.getIsPinned() !== "end") {
      return sum
    }
    return sum + getDataGridColumnLayoutWidth(column, columnSizing, tableLayout)
  }, 0)

interface DataGridRightPinOffsetInput<TData extends RowData> {
  readonly column: Column<DataGridFeatures, TData>
  readonly columnSizing: ColumnSizingState
  readonly pinLayout: DataGridPinLayout | undefined
  readonly table: Table<DataGridFeatures, TData>
  readonly tableLayout: DataGridTableLayout | undefined
}

const getDataGridRightPinOffset = <TData extends RowData>(input: DataGridRightPinOffsetInput<TData>): number => {
  const { column, columnSizing, pinLayout, table, tableLayout } = input
  const columns = getDataGridLayoutColumns(table)

  let offset = 0

  for (let index = columns.length - 1; index >= 0; index -= 1) {
    const col = columns[index]
    if (col === undefined || col.id === column.id) {
      break
    }
    if (col.getIsPinned() === "end") {
      offset += getDataGridColumnLayoutWidth(col, columnSizing, tableLayout)
    }
  }

  if (pinLayout !== undefined) {
    offset += Math.max(0, pinLayout.tableClientWidth - pinLayout.tableWidth)
  }

  return offset
}

export const getDataGridPinOffset = <TData extends RowData>(input: DataGridPinOffsetInput<TData>): number | undefined => {
  const { column, columnSizing, isPinned, pinLayout, table, tableLayout } = input
  if (isPinned === false) {
    return undefined
  }

  const columns = getDataGridLayoutColumns(table)

  if (isPinned === "start") {
    let offset = 0
    for (const col of columns) {
      if (col.id === column.id) {
        break
      }
      if (col.getIsPinned() === "start") {
        offset += getDataGridColumnLayoutWidth(col, columnSizing, tableLayout)
      }
    }
    return offset
  }

  return getDataGridRightPinOffset({ column, columnSizing, pinLayout, table, tableLayout })
}
