import type { CSSProperties } from "react";

import type { Column, ColumnSizingState, RowData } from "@tanstack/react-table";

import { getDataGridColumnDefMinSize } from "~/src/components/custom/datagrid/lib/data-grid-column-widths";
import {
  columnAbsorbsTrailingSlack,
  columnFillsRemainingWidth,
  type DataGridTableLayout
} from "~/src/components/custom/datagrid/lib/data-grid-table-layout";

/** Slug for CSS custom properties (`admin.catalog.attributes:v6` → `admin-catalog-attributes-v6`). */
export function dataGridPersistenceKeySlug(persistenceKey: string): string {
  return persistenceKey.replaceAll(".", "-").replaceAll(":", "-");
}

export function dataGridColumnWidthCssVar(persistenceKey: string, columnId: string): string {
  return `--marte-dg-${dataGridPersistenceKeySlug(persistenceKey)}-${columnId}`;
}

function dataGridColumnWidthValue(persistenceKey: string, columnId: string, fallbackPx: number): string {
  return `var(${dataGridColumnWidthCssVar(persistenceKey, columnId)}, ${fallbackPx}px)`;
}

const MIN_COLUMN_SIZE = 0;

export interface SyncDataGridColumnSizingCssVarsInput {
  readonly columnIds: readonly string[];
  readonly columnMaxSizes?: Readonly<Record<string, number>>;
  readonly persistenceKey: string;
  readonly sizing: ColumnSizingState;
}

/** Clears stale vars, then applies clamped saved widths (head script + live resize). */
export function syncDataGridColumnSizingCssVars({
  columnIds,
  columnMaxSizes = {},
  persistenceKey,
  sizing
}: SyncDataGridColumnSizingCssVarsInput): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  for (const columnId of columnIds) {
    root.style.removeProperty(dataGridColumnWidthCssVar(persistenceKey, columnId));
  }

  for (const [columnId, size] of Object.entries(sizing)) {
    if (typeof size === "number" && Number.isFinite(size) && size > MIN_COLUMN_SIZE) {
      const maxSize = columnMaxSizes[columnId];
      const widthPx = maxSize === undefined ? size : Math.min(size, maxSize);
      root.style.setProperty(dataGridColumnWidthCssVar(persistenceKey, columnId), `${widthPx}px`);
    }
  }
}

/** @deprecated Prefer `syncDataGridColumnSizingCssVars` so orphan vars (e.g. former slack columns) are cleared. */
export function applyDataGridColumnSizingCssVars(persistenceKey: string, sizing: ColumnSizingState): void {
  syncDataGridColumnSizingCssVars({
    columnIds: Object.keys(sizing),
    persistenceKey,
    sizing
  });
}

export function clearDataGridColumnSizingCssVars(persistenceKey: string, columnIds: readonly string[]): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  for (const columnId of columnIds) {
    root.style.removeProperty(dataGridColumnWidthCssVar(persistenceKey, columnId));
  }
}

function buildFixedColumnWidthStyle(sizePx: number): Pick<CSSProperties, "boxSizing" | "maxWidth" | "minWidth" | "width"> {
  const px = `${sizePx}px`;
  return {
    boxSizing: "border-box",
    maxWidth: px,
    minWidth: px,
    width: px
  };
}

function usesLayoutWidth<TData extends RowData>(column: Column<TData>, layout: DataGridTableLayout | undefined): boolean {
  if (columnFillsRemainingWidth(column)) {
    return true;
  }
  return columnAbsorbsTrailingSlack(column) && layout?.fillColumnIsUserSized === true;
}

/** Inline width styles; resizable columns use CSS variables to avoid SSR width flash. */
export function buildDataGridColumnWidthStyle<TData extends RowData>(input: {
  readonly column: Column<TData>;
  readonly layout?: DataGridTableLayout;
  readonly persistenceKey?: string;
  readonly widthPx: number;
}): Pick<CSSProperties, "boxSizing" | "maxWidth" | "minWidth" | "width"> {
  const { column, layout, persistenceKey, widthPx } = input;

  if (columnFillsRemainingWidth(column) && layout === undefined) {
    const minWidthPx = getDataGridColumnDefMinSize(column);
    return {
      boxSizing: "border-box",
      width: "auto",
      ...(minWidthPx === undefined ? {} : { minWidth: `${minWidthPx}px` })
    };
  }

  if (!column.getCanResize() || usesLayoutWidth(column, layout) || persistenceKey === undefined) {
    return buildFixedColumnWidthStyle(widthPx);
  }

  const value = dataGridColumnWidthValue(persistenceKey, column.id, widthPx);
  const minWidthPx = getDataGridColumnDefMinSize(column);
  const width = minWidthPx === undefined ? value : `max(${value}, ${minWidthPx}px)`;
  const minWidth = minWidthPx === undefined ? value : `${minWidthPx}px`;

  return {
    boxSizing: "border-box",
    maxWidth: width,
    minWidth,
    width
  };
}
