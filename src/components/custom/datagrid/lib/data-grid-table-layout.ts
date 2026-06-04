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

/** Canonical width from the column def — ignores stray persisted `columnSizing` overrides. */
export function readColumnDesignWidth<TData extends RowData>(column: Column<TData>): number {
  const { size } = column.columnDef;
  if (typeof size === "number" && Number.isFinite(size)) {
    return size;
  }
  return readColumnMinWidth(column);
}

function readSlackAbsorberWidth<TData extends RowData>(column: Column<TData>): number {
  return readColumnDesignWidth(column);
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
  readonly intrinsicSum: number;
  readonly minFill: number;
  readonly tableClientWidth: number;
}): DataGridTableLayout {
  const { absorberColumn, intrinsicSum, minFill, tableClientWidth } = input;
  const absorberWidth = absorberColumn === undefined ? ZERO : readSlackAbsorberWidth(absorberColumn);

  const fillColumnWidth = Math.max(minFill, tableClientWidth - intrinsicSum - absorberWidth);

  return {
    fillColumnIsUserSized: false,
    fillColumnWidth,
    slackAbsorberColumnWidth: absorberWidth,
    tableWidth: Math.max(tableClientWidth, intrinsicSum + fillColumnWidth + absorberWidth)
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
  const preferredFill = Math.max(minFill, preferredFillWidth);

  if (absorberColumn === undefined) {
    // Catalog tables have no trailing slack absorber: grow the fill column so widths sum to the
    // container. Otherwise `table-layout: fixed` distributes slack into utility columns (select/actions).
    const fillWidth = Math.max(preferredFill, tableClientWidth - intrinsicSum);

    return {
      fillColumnIsUserSized: true,
      fillColumnWidth: fillWidth,
      slackAbsorberColumnWidth: ZERO,
      tableWidth: Math.max(tableClientWidth, intrinsicSum + fillWidth)
    };
  }

  const minAbsorber = readColumnMinWidth(absorberColumn);
  const designAbsorber = readSlackAbsorberWidth(absorberColumn);
  const expandedAbsorber = tableClientWidth - intrinsicSum - preferredFill;
  const absorberWidth = Math.min(designAbsorber, Math.max(minAbsorber, expandedAbsorber));

  return {
    fillColumnIsUserSized: true,
    fillColumnWidth: preferredFill,
    slackAbsorberColumnWidth: absorberWidth,
    tableWidth: Math.max(tableClientWidth, intrinsicSum + preferredFill + absorberWidth)
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
    return resolveFlexFillLayout({ absorberColumn, intrinsicSum, minFill, tableClientWidth });
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

  if (columnAbsorbsTrailingSlack(column)) {
    if (layout.fillColumnIsUserSized) {
      return Math.min(layout.slackAbsorberColumnWidth, readSlackAbsorberWidth(column));
    }
    return readSlackAbsorberWidth(column);
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
