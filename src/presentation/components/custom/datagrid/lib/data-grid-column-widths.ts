import { type Column, type ColumnSizingState, type RowData } from "@tanstack/react-table"

import { columnAbsorbsTrailingSlack, readColumnDesignWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid-table-layout"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

/** Width from column def only — never from `columnSizing` state. */
export const getFixedDataGridColumnDefSize = <TData extends RowData>(column: Column<DataGridFeatures, TData>): number | undefined => {
  const { maxSize, minSize, size } = column.columnDef
  if (typeof size === "number" && Number.isFinite(size)) {
    return size
  }
  if (typeof minSize === "number" && typeof maxSize === "number" && minSize === maxSize && Number.isFinite(minSize)) {
    return minSize
  }
  return undefined
}

export const getDataGridColumnDefMinSize = <TData extends RowData>(column: Column<DataGridFeatures, TData>): number | undefined => {
  const { minSize } = column.columnDef
  return typeof minSize === "number" && Number.isFinite(minSize) ? minSize : undefined
}

/** Pixel width from column defs — never TanStack `getSize()` (it shifts unrelated columns during resize). */
export const getDataGridColumnWidth = <TData extends RowData>(column: Column<DataGridFeatures, TData>): number => {
  if (!column.getCanResize()) {
    const locked = getFixedDataGridColumnDefSize(column)
    if (locked !== undefined) {
      return locked
    }
  }

  const designWidth = readColumnDesignWidth(column)
  const defMin = getDataGridColumnDefMinSize(column)
  return defMin === undefined ? designWidth : Math.max(designWidth, defMin)
}

export const getDataGridLayoutColumnWidth = <TData extends RowData>(
  column: Column<DataGridFeatures, TData>,
  columnSizing: ColumnSizingState,
): number => {
  if (columnAbsorbsTrailingSlack(column)) {
    return readColumnDesignWidth(column)
  }

  const override = columnSizing[column.id]
  if (column.getCanResize() && typeof override === "number" && Number.isFinite(override)) {
    const defMin = getDataGridColumnDefMinSize(column)
    const { maxSize } = column.columnDef
    const clamped = defMin === undefined ? override : Math.max(override, defMin)
    if (typeof maxSize === "number" && Number.isFinite(maxSize)) {
      return Math.min(clamped, maxSize)
    }
    return clamped
  }

  return getDataGridColumnWidth(column)
}
