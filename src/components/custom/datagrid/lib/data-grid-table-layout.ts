import type { Column, ColumnSizingState, RowData } from "@tanstack/react-table";

import { getDataGridColumnWidth, getDataGridLayoutColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid-column-widths";

const ZERO = 0;

export function columnFillsRemainingWidth<TData extends RowData>(column: Column<TData>): boolean {
  return column.columnDef.meta?.fillsRemainingWidth === true;
}

export function columnAbsorbsTrailingSlack<TData extends RowData>(column: Column<TData>): boolean {
  return column.columnDef.meta?.absorbsTrailingSlack === true;
}

export function columnFillUsesFlexWidth<TData extends RowData>(input: {
  readonly column: Column<TData>;
  readonly columnSizing: ColumnSizingState;
}): boolean {
  const { column, columnSizing } = input;
  return columnFillsRemainingWidth(column) && columnSizing[column.id] === undefined;
}

export interface DataGridTableLayout {
  readonly fillColumnIsUserSized: boolean;
  readonly fillColumnWidth: number;
  readonly slackAbsorberColumnWidth: number;
  readonly tableWidth: number;
}

function findFillColumn<TData extends RowData>(columns: readonly Column<TData>[]): Column<TData> | undefined {
  return columns.find((column) => columnFillsRemainingWidth(column));
}

function findSlackAbsorberColumn<TData extends RowData>(columns: readonly Column<TData>[]): Column<TData> | undefined {
  return columns.find((column) => columnAbsorbsTrailingSlack(column));
}

function readColumnMinWidth<TData extends RowData>(column: Column<TData>): number {
  const { minSize, size } = column.columnDef;
  if (typeof minSize === "number" && Number.isFinite(minSize)) {
    return minSize;
  }
  if (typeof size === "number" && Number.isFinite(size)) {
    return size;
  }
  return ZERO;
}

/** Sum of columns with explicit widths (excludes fill + slack absorber). */
export function getDataGridIntrinsicColumnsWidthSum<TData extends RowData>(
  columns: readonly Column<TData>[],
  columnSizing: ColumnSizingState
): number {
  return columns.reduce((sum, column) => {
    if (columnFillsRemainingWidth(column) || columnAbsorbsTrailingSlack(column)) {
      return sum;
    }
    return sum + getDataGridLayoutColumnWidth(column, columnSizing);
  }, ZERO);
}

function resolveFlexFillLayout<TData extends RowData>(input: {
  readonly absorberColumn: Column<TData> | undefined;
  readonly columnSizing: ColumnSizingState;
  readonly intrinsicSum: number;
  readonly minFill: number;
  readonly tableClientWidth: number;
}): DataGridTableLayout {
  const { absorberColumn, columnSizing, intrinsicSum, minFill, tableClientWidth } = input;
  const absorberWidth = absorberColumn === undefined ? ZERO : getDataGridLayoutColumnWidth(absorberColumn, columnSizing);

  return {
    fillColumnIsUserSized: false,
    fillColumnWidth: Math.max(minFill, tableClientWidth - intrinsicSum - absorberWidth),
    slackAbsorberColumnWidth: absorberWidth,
    tableWidth: tableClientWidth
  };
}

function resolveUserSizedFillLayout<TData extends RowData>(input: {
  readonly absorberColumn: Column<TData> | undefined;
  readonly intrinsicSum: number;
  readonly minFill: number;
  readonly preferredFillWidth: number;
  readonly tableClientWidth: number;
}): DataGridTableLayout {
  const { absorberColumn, intrinsicSum, minFill, preferredFillWidth, tableClientWidth } = input;
  const fillWidth = Math.max(minFill, preferredFillWidth);
  const minAbsorber = absorberColumn === undefined ? ZERO : readColumnMinWidth(absorberColumn);
  const absorberWidth = absorberColumn === undefined ? ZERO : Math.max(minAbsorber, tableClientWidth - intrinsicSum - fillWidth);

  return {
    fillColumnIsUserSized: true,
    fillColumnWidth: fillWidth,
    slackAbsorberColumnWidth: absorberWidth,
    tableWidth: Math.max(tableClientWidth, intrinsicSum + fillWidth + absorberWidth)
  };
}

/**
 * Fill column + optional trailing slack absorber:
 * - Default: fill column grows; absorber keeps its saved width; table spans the container.
 * - User-sized fill: fill column uses saved width; absorber expands to keep the table full width.
 */
export function resolveDataGridTableLayout<TData extends RowData>(input: {
  readonly columnSizing: ColumnSizingState;
  readonly columns: readonly Column<TData>[];
  readonly tableClientWidth: number;
}): DataGridTableLayout | undefined {
  const { columnSizing, columns, tableClientWidth } = input;
  if (tableClientWidth <= ZERO) {
    return undefined;
  }

  const fillColumn = findFillColumn(columns);
  if (fillColumn === undefined) {
    return {
      fillColumnIsUserSized: false,
      fillColumnWidth: ZERO,
      slackAbsorberColumnWidth: ZERO,
      tableWidth: getDataGridTableMinWidth(columns, columnSizing)
    };
  }

  const absorberColumn = findSlackAbsorberColumn(columns);
  const intrinsicSum = getDataGridIntrinsicColumnsWidthSum(columns, columnSizing);
  const minFill = readColumnMinWidth(fillColumn);
  const preferred = columnSizing[fillColumn.id];
  const preferredFillWidth = typeof preferred === "number" && Number.isFinite(preferred) ? preferred : undefined;

  if (preferredFillWidth === undefined) {
    return resolveFlexFillLayout({ absorberColumn, columnSizing, intrinsicSum, minFill, tableClientWidth });
  }

  return resolveUserSizedFillLayout({
    absorberColumn,
    intrinsicSum,
    minFill,
    preferredFillWidth,
    tableClientWidth
  });
}

export function getDataGridColumnLayoutWidth<TData extends RowData>(
  column: Column<TData>,
  columnSizing: ColumnSizingState,
  layout: DataGridTableLayout | undefined
): number {
  if (layout === undefined) {
    return getDataGridLayoutColumnWidth(column, columnSizing);
  }

  if (columnFillsRemainingWidth(column)) {
    return layout.fillColumnWidth;
  }

  if (columnAbsorbsTrailingSlack(column) && layout.fillColumnIsUserSized) {
    return layout.slackAbsorberColumnWidth;
  }

  return getDataGridLayoutColumnWidth(column, columnSizing);
}

export function getDataGridContentWidth<TData extends RowData>(input: {
  readonly columnSizing: ColumnSizingState;
  readonly columns: readonly Column<TData>[];
  readonly tableClientWidth: number;
}): number {
  if (input.tableClientWidth <= ZERO) {
    return getDataGridTableMinWidth(input.columns, input.columnSizing);
  }

  const layout = resolveDataGridTableLayout(input);
  return layout?.tableWidth ?? getDataGridTableMinWidth(input.columns, input.columnSizing);
}

export function getDataGridTableMinWidth<TData extends RowData>(
  columns: readonly Column<TData>[],
  columnSizing: ColumnSizingState
): number {
  return columns.reduce((sum, column) => {
    if (columnFillsRemainingWidth(column)) {
      const { minSize } = column.columnDef;
      const fallback = typeof minSize === "number" && Number.isFinite(minSize) ? minSize : getDataGridColumnWidth(column);
      const override = columnSizing[column.id];
      return sum + (typeof override === "number" && Number.isFinite(override) ? override : fallback);
    }
    return sum + getDataGridLayoutColumnWidth(column, columnSizing);
  }, ZERO);
}
