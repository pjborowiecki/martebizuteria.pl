import { type Column, type ColumnSizingState, type RowData } from "@tanstack/react-table"

import {
  getDataGridColumnWidth,
  getDataGridLayoutColumnWidth,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-widths"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

export const columnFillsRemainingWidth = <TData extends RowData>(column: Column<DataGridFeatures, TData>): boolean =>
  column.columnDef.meta?.fillsRemainingWidth === true

export const columnAbsorbsTrailingSlack = <TData extends RowData>(column: Column<DataGridFeatures, TData>): boolean =>
  column.columnDef.meta?.absorbsTrailingSlack === true

export const columnFillUsesFlexWidth = <TData extends RowData>(input: {
  readonly column: Column<DataGridFeatures, TData>
  readonly columnSizing: ColumnSizingState
}): boolean => {
  const { column, columnSizing } = input
  return columnFillsRemainingWidth(column) && columnSizing[column.id] === undefined
}

export interface DataGridTableLayout {
  readonly fillColumnIsUserSized: boolean
  readonly fillColumnWidth: number
  readonly slackAbsorberColumnWidth: number
  readonly tableWidth: number
}

const findFillColumn = <TData extends RowData>(
  columns: readonly Column<DataGridFeatures, TData>[],
): Column<DataGridFeatures, TData> | undefined => columns.find((column) => columnFillsRemainingWidth(column))

const findSlackAbsorberColumn = <TData extends RowData>(
  columns: readonly Column<DataGridFeatures, TData>[],
): Column<DataGridFeatures, TData> | undefined => columns.find((column) => columnAbsorbsTrailingSlack(column))

const readColumnMinWidth = <TData extends RowData>(column: Column<DataGridFeatures, TData>): number => {
  const { minSize, size } = column.columnDef
  if (typeof minSize === "number" && Number.isFinite(minSize)) {
    return minSize
  }
  if (typeof size === "number" && Number.isFinite(size)) {
    return size
  }
  return 0
}

/** Canonical width from the column def — ignores stray persisted `columnSizing` overrides. */
export const readColumnDesignWidth = <TData extends RowData>(column: Column<DataGridFeatures, TData>): number => {
  const { size } = column.columnDef
  if (typeof size === "number" && Number.isFinite(size)) {
    return size
  }
  return readColumnMinWidth(column)
}

const readSlackAbsorberWidth = <TData extends RowData>(column: Column<DataGridFeatures, TData>): number => readColumnDesignWidth(column)

/** Sum of columns with explicit widths (excludes fill + slack absorber). */
export const getDataGridIntrinsicColumnsWidthSum = <TData extends RowData>(
  columns: readonly Column<DataGridFeatures, TData>[],
  columnSizing: ColumnSizingState,
): number =>
  columns.reduce((sum, column) => {
    if (columnFillsRemainingWidth(column) || columnAbsorbsTrailingSlack(column)) {
      return sum
    }
    return sum + getDataGridLayoutColumnWidth(column, columnSizing)
  }, 0)

const resolveFlexFillLayout = <TData extends RowData>(input: {
  readonly absorberColumn: Column<DataGridFeatures, TData> | undefined
  readonly intrinsicSum: number
  readonly minFill: number
  readonly tableClientWidth: number
}): DataGridTableLayout => {
  const { absorberColumn, intrinsicSum, minFill, tableClientWidth } = input
  const absorberWidth = absorberColumn === undefined ? 0 : readSlackAbsorberWidth(absorberColumn)

  const fillColumnWidth = Math.max(minFill, tableClientWidth - intrinsicSum - absorberWidth)

  return {
    fillColumnIsUserSized: false,
    fillColumnWidth,
    slackAbsorberColumnWidth: absorberWidth,
    tableWidth: Math.max(tableClientWidth, intrinsicSum + fillColumnWidth + absorberWidth),
  }
}

const resolveUserSizedFillLayout = <TData extends RowData>(input: {
  readonly absorberColumn: Column<DataGridFeatures, TData> | undefined
  readonly intrinsicSum: number
  readonly minFill: number
  readonly preferredFillWidth: number
  readonly tableClientWidth: number
}): DataGridTableLayout => {
  const { absorberColumn, intrinsicSum, minFill, preferredFillWidth, tableClientWidth } = input
  const preferredFill = Math.max(minFill, preferredFillWidth)

  if (absorberColumn === undefined) {
    // Catalog tables have no trailing slack absorber, so the fill column grows until widths sum to the container.
    // Otherwise `table-layout: fixed` distributes slack into utility columns (select/actions).
    const fillWidth = Math.max(preferredFill, tableClientWidth - intrinsicSum)

    return {
      fillColumnIsUserSized: true,
      fillColumnWidth: fillWidth,
      slackAbsorberColumnWidth: 0,
      tableWidth: Math.max(tableClientWidth, intrinsicSum + fillWidth),
    }
  }

  const minAbsorber = readColumnMinWidth(absorberColumn)
  const designAbsorber = readSlackAbsorberWidth(absorberColumn)
  const expandedAbsorber = tableClientWidth - intrinsicSum - preferredFill
  const absorberWidth = Math.min(designAbsorber, Math.max(minAbsorber, expandedAbsorber))

  return {
    fillColumnIsUserSized: true,
    fillColumnWidth: preferredFill,
    slackAbsorberColumnWidth: absorberWidth,
    tableWidth: Math.max(tableClientWidth, intrinsicSum + preferredFill + absorberWidth),
  }
}

/**
 * Fill column + optional trailing slack absorber:
 * - Default: fill column grows; absorber keeps its saved width; table spans the container.
 * - User-sized fill: fill column uses saved width; absorber expands to keep the table full width.
 */
export const resolveDataGridTableLayout = <TData extends RowData>(input: {
  readonly columnSizing: ColumnSizingState
  readonly columns: readonly Column<DataGridFeatures, TData>[]
  readonly tableClientWidth: number
}): DataGridTableLayout | undefined => {
  const { columnSizing, columns, tableClientWidth } = input
  if (tableClientWidth <= 0) {
    return undefined
  }

  const fillColumn = findFillColumn(columns)
  if (fillColumn === undefined) {
    return {
      fillColumnIsUserSized: false,
      fillColumnWidth: 0,
      slackAbsorberColumnWidth: 0,
      tableWidth: getDataGridTableMinWidth(columns, columnSizing),
    }
  }

  const absorberColumn = findSlackAbsorberColumn(columns)
  const intrinsicSum = getDataGridIntrinsicColumnsWidthSum(columns, columnSizing)
  const minFill = readColumnMinWidth(fillColumn)
  const preferred = columnSizing[fillColumn.id]
  const preferredFillWidth = typeof preferred === "number" && Number.isFinite(preferred) ? preferred : undefined

  if (preferredFillWidth === undefined) {
    return resolveFlexFillLayout({ absorberColumn, intrinsicSum, minFill, tableClientWidth })
  }

  return resolveUserSizedFillLayout({
    absorberColumn,
    intrinsicSum,
    minFill,
    preferredFillWidth,
    tableClientWidth,
  })
}

export const getDataGridColumnLayoutWidth = <TData extends RowData>(
  column: Column<DataGridFeatures, TData>,
  columnSizing: ColumnSizingState,
  layout: DataGridTableLayout | undefined,
): number => {
  if (layout === undefined) {
    return getDataGridLayoutColumnWidth(column, columnSizing)
  }

  if (columnFillsRemainingWidth(column)) {
    return layout.fillColumnWidth
  }

  if (columnAbsorbsTrailingSlack(column)) {
    if (layout.fillColumnIsUserSized) {
      return Math.min(layout.slackAbsorberColumnWidth, readSlackAbsorberWidth(column))
    }
    return readSlackAbsorberWidth(column)
  }

  return getDataGridLayoutColumnWidth(column, columnSizing)
}

export const getDataGridContentWidth = <TData extends RowData>(input: {
  readonly columnSizing: ColumnSizingState
  readonly columns: readonly Column<DataGridFeatures, TData>[]
  readonly tableClientWidth: number
}): number => {
  if (input.tableClientWidth <= 0) {
    return getDataGridTableMinWidth(input.columns, input.columnSizing)
  }

  const layout = resolveDataGridTableLayout(input)
  return layout?.tableWidth ?? getDataGridTableMinWidth(input.columns, input.columnSizing)
}

export const getDataGridTableMinWidth = <TData extends RowData>(
  columns: readonly Column<DataGridFeatures, TData>[],
  columnSizing: ColumnSizingState,
): number =>
  columns.reduce((sum, column) => {
    if (columnFillsRemainingWidth(column)) {
      const { minSize } = column.columnDef
      const fallback = typeof minSize === "number" && Number.isFinite(minSize) ? minSize : getDataGridColumnWidth(column)
      const override = columnSizing[column.id]
      return sum + (typeof override === "number" && Number.isFinite(override) ? override : fallback)
    }
    return sum + getDataGridLayoutColumnWidth(column, columnSizing)
  }, 0)

/** Sum of resolved layout column widths — must match `<colgroup>` to avoid phantom horizontal scroll. */
export const sumDataGridLayoutColumnWidths = <TData extends RowData>(
  columns: readonly Column<DataGridFeatures, TData>[],
  columnSizing: ColumnSizingState,
  layout: DataGridTableLayout | undefined,
): number => columns.reduce((sum, column) => sum + getDataGridColumnLayoutWidth(column, columnSizing, layout), 0)
