import type { Column, ColumnSizingState, RowData } from "@tanstack/react-table";

import { columnAbsorbsTrailingSlack, readColumnDesignWidth } from "~/src/components/custom/datagrid/lib/data-grid-table-layout";

/** Width from column def only — never from `columnSizing` state. */
export function getFixedDataGridColumnDefSize<TData extends RowData>(column: Column<TData>): number | undefined {
  const { maxSize, minSize, size } = column.columnDef;
  if (typeof size === "number" && Number.isFinite(size)) {
    return size;
  }
  if (typeof minSize === "number" && typeof maxSize === "number" && minSize === maxSize && Number.isFinite(minSize)) {
    return minSize;
  }
  return undefined;
}

export function getDataGridColumnDefMinSize<TData extends RowData>(column: Column<TData>): number | undefined {
  const { minSize } = column.columnDef;
  return typeof minSize === "number" && Number.isFinite(minSize) ? minSize : undefined;
}

/** Pixel width for layout; utility columns always use locked def sizes, not TanStack `getSize()`. */
export function getDataGridColumnWidth<TData extends RowData>(column: Column<TData>): number {
  if (!column.getCanResize()) {
    const locked = getFixedDataGridColumnDefSize(column);
    if (locked !== undefined) {
      return locked;
    }
  }

  const size = column.getSize();
  const defMin = getDataGridColumnDefMinSize(column);
  return defMin === undefined ? size : Math.max(size, defMin);
}

export function getDataGridLayoutColumnWidth<TData extends RowData>(column: Column<TData>, columnSizing: ColumnSizingState): number {
  if (columnAbsorbsTrailingSlack(column)) {
    return readColumnDesignWidth(column);
  }

  const override = columnSizing[column.id];
  if (column.getCanResize() && typeof override === "number" && Number.isFinite(override)) {
    const defMin = getDataGridColumnDefMinSize(column);
    const { maxSize } = column.columnDef;
    const clamped = defMin === undefined ? override : Math.max(override, defMin);
    if (typeof maxSize === "number" && Number.isFinite(maxSize)) {
      return Math.min(clamped, maxSize);
    }
    return clamped;
  }
  return getDataGridColumnWidth(column);
}
