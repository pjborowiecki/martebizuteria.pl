import type { Column, ColumnDef, ColumnSizingState, Header, RowData, Table } from "@tanstack/react-table";

import { getDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid-column-widths";
import { getDataGridColumnLayoutWidth, type DataGridTableLayout } from "~/src/components/custom/datagrid/lib/data-grid-table-layout";

const NOT_FOUND_INDEX = -1;
const REMOVE_ONE = 1;
const NO_DELETE = 0;
const ZERO = 0;
const DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX = 720;
const FILL_COLUMN_MAX_WIDTH_MULTIPLIER = 2.5;

/** Column ids that must never receive persisted/CSS-var widths (shared across admin datagrids). */
export const DATAGRID_UTILITY_COLUMN_IDS = ["actions", "drag", "image", "select"] as const;

/** Column def fragment for utility columns (checkbox, drag, actions) that must not resize. */
export function fixedDataGridColumnWidth(size: number) {
  return {
    enableResizing: false as const,
    maxSize: size,
    minSize: size,
    size
  };
}

function getColumnDefId<TData extends RowData>(column: ColumnDef<TData>): string | undefined {
  if (typeof column.id === "string") {
    return column.id;
  }
  const accessorKey = "accessorKey" in column && typeof column.accessorKey === "string" ? column.accessorKey : undefined;
  return accessorKey;
}

function columnDefAbsorbsTrailingSlack<TData extends RowData>(column: ColumnDef<TData>): boolean {
  return column.meta?.absorbsTrailingSlack === true;
}

/** Ids of columns excluded from persisted sizing (fixed utility + slack absorber). */
export function getNonResizableColumnIds<TData extends RowData>(columns: ColumnDef<TData>[]): string[] {
  return columns.flatMap((column) => {
    const id = getColumnDefId(column);
    if (id === undefined) {
      return [];
    }
    if (column.enableResizing === false || columnDefAbsorbsTrailingSlack(column)) {
      return [id];
    }
    return [];
  });
}

/** Per-column minimum widths for clamping persisted sizing (resizable columns only). */
export function buildDataGridColumnMinSizes<TData extends RowData>(columns: ColumnDef<TData>[]): Record<string, number> {
  return columns.reduce<Record<string, number>>((next, column) => {
    if (column.enableResizing === false) {
      return next;
    }
    const id = getColumnDefId(column);
    const { minSize } = column;
    if (id !== undefined && typeof minSize === "number" && Number.isFinite(minSize)) {
      next[id] = minSize;
    }
    return next;
  }, {});
}

function readColumnDefMaxWidth<TData extends RowData>(column: ColumnDef<TData>): number | undefined {
  const { maxSize, minSize, size } = column;
  if (typeof maxSize === "number" && Number.isFinite(maxSize)) {
    return maxSize;
  }
  if (typeof size === "number" && Number.isFinite(size)) {
    const expanded = Math.round(size * FILL_COLUMN_MAX_WIDTH_MULTIPLIER);
    const floor = typeof minSize === "number" && Number.isFinite(minSize) ? minSize : size;
    return Math.min(Math.max(expanded, floor), DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX);
  }
  return DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX;
}

/** Per-column maximum widths for clamping persisted sizing and CSS vars (resizable columns only). */
export function buildDataGridColumnMaxSizes<TData extends RowData>(columns: ColumnDef<TData>[]): Record<string, number> {
  return columns.reduce<Record<string, number>>((next, column) => {
    if (column.enableResizing === false) {
      return next;
    }
    const id = getColumnDefId(column);
    const maxWidth = readColumnDefMaxWidth(column);
    if (id !== undefined && maxWidth !== undefined) {
      next[id] = maxWidth;
    }
    return next;
  }, {});
}

export function clampDataGridColumnSizingToMins(
  sizing: ColumnSizingState,
  columnMinSizes: Readonly<Record<string, number>>
): ColumnSizingState {
  const next: ColumnSizingState = { ...sizing };

  for (const [id, minSize] of Object.entries(columnMinSizes)) {
    const size = next[id];
    if (typeof size === "number" && Number.isFinite(size) && size < minSize) {
      next[id] = minSize;
    }
  }

  return next;
}

export function clampDataGridColumnSizingToMaxes(
  sizing: ColumnSizingState,
  columnMaxSizes: Readonly<Record<string, number>> = {},
  fallbackMaxWidthPx: number = DEFAULT_SAVED_COLUMN_MAX_WIDTH_PX
): ColumnSizingState {
  const next: ColumnSizingState = { ...sizing };

  for (const [id, size] of Object.entries(next)) {
    if (typeof size === "number" && Number.isFinite(size)) {
      const maxSize = columnMaxSizes[id] ?? fallbackMaxWidthPx;
      if (size > maxSize) {
        next[id] = maxSize;
      }
    }
  }

  return next;
}

export function clampDataGridColumnSizing(
  sizing: ColumnSizingState,
  columnMinSizes: Readonly<Record<string, number>>,
  columnMaxSizes: Readonly<Record<string, number>> = {}
): ColumnSizingState {
  return clampDataGridColumnSizingToMaxes(clampDataGridColumnSizingToMins(sizing, columnMinSizes), columnMaxSizes);
}

export function measureDataGridContainerWidth(event: Event): number {
  const { target } = event;
  if (!(target instanceof Element)) {
    return ZERO;
  }
  const container = target.closest("[data-slot='data-table-container']");
  return container instanceof HTMLElement ? container.clientWidth : ZERO;
}

/** Drops sizing entries for utility columns so localStorage cannot widen checkboxes/actions. */
export function omitNonResizableColumnSizing(sizing: ColumnSizingState, nonResizableColumnIds: readonly string[]): ColumnSizingState {
  const fixed = new Set(nonResizableColumnIds);
  const next: ColumnSizingState = {};

  for (const [id, size] of Object.entries(sizing)) {
    if (!fixed.has(id)) {
      next[id] = size;
    }
  }

  return next;
}

/**
 * Leaf header row used for `<colgroup>`, `<th>`, and `<td>` (left → center → right).
 * Prefer the deepest header group and skip placeholders so column add/remove cannot desync layout.
 */
export function getDataGridLayoutHeaders<TData extends RowData>(table: Table<TData>): Header<TData, unknown>[] {
  const headerGroups = table.getHeaderGroups();
  if (headerGroups.length === ZERO) {
    return [];
  }

  const leafGroup = headerGroups[headerGroups.length - REMOVE_ONE];
  return leafGroup.headers.filter((header) => !header.isPlaceholder);
}

export function getDataGridLayoutColumns<TData extends RowData>(table: Table<TData>): Column<TData>[] {
  const headers = getDataGridLayoutHeaders(table);
  if (headers.length === ZERO) {
    return table.getVisibleLeafColumns();
  }
  return headers.map((header) => header.column);
}

/** Default column order from a `columns` array (declaration order in the column defs). */
export function getDataGridColumnIds<TData extends RowData>(columns: ColumnDef<TData>[]): string[] {
  return columns.flatMap((column) => {
    if (typeof column.id === "string") {
      return [column.id];
    }
    const accessorKey = "accessorKey" in column && typeof column.accessorKey === "string" ? column.accessorKey : undefined;
    return accessorKey === undefined ? [] : [accessorKey];
  });
}

/** Returns a new id list with `draggedId` moved into the slot held by `overId`. */
export function reorderColumnOrder(order: readonly string[], draggedId: string, overId: string): string[] {
  if (draggedId === overId) {
    return [...order];
  }

  const from = order.indexOf(draggedId);
  const to = order.indexOf(overId);
  if (from === NOT_FOUND_INDEX || to === NOT_FOUND_INDEX) {
    return [...order];
  }

  const next = [...order];
  const [moved] = next.splice(from, REMOVE_ONE);
  next.splice(to, NO_DELETE, moved);
  return next;
}

/** Returns a new list with the `draggingId` item moved to the position of `overId`. */
export function moveItemBefore<TItem extends { id: string }>(list: readonly TItem[], draggingId: string, overId: string): TItem[] {
  if (draggingId === overId) {
    return [...list];
  }

  const from = list.findIndex((item) => item.id === draggingId);
  const to = list.findIndex((item) => item.id === overId);
  if (from === NOT_FOUND_INDEX || to === NOT_FOUND_INDEX) {
    return [...list];
  }

  const next = [...list];
  const [moved] = next.splice(from, REMOVE_ONE);
  next.splice(to, NO_DELETE, moved);
  return next;
}

/** Returns a new list with the item at `index` swapped with `target`, if in range. */
export function swapItems<TItem extends { id: string }>(list: readonly TItem[], index: number, target: number): TItem[] {
  if (index === NOT_FOUND_INDEX || target < ZERO || target >= list.length) {
    return [...list];
  }

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Shallow, order-sensitive equality between two id lists. */
export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export interface DataGridPinOffsetInput<TData extends RowData> {
  readonly column: Column<TData>;
  readonly isPinned: false | "left" | "right";
  readonly layout?: DataGridPinLayout;
  readonly table: Table<TData>;
}

export interface DataGridPinLayout {
  readonly tableClientWidth: number;
  readonly tableWidth: number;
}

export function getDataGridRightPinnedScrollPaddingPx<TData extends RowData>(
  layoutColumns: readonly Column<TData>[],
  columnSizing: ColumnSizingState,
  tableLayout: DataGridTableLayout | undefined
): number {
  return layoutColumns.reduce((sum, column) => {
    if (column.getIsPinned() !== "right") {
      return sum;
    }
    return sum + getDataGridColumnLayoutWidth(column, columnSizing, tableLayout);
  }, ZERO);
}

function getDataGridRightPinOffset<TData extends RowData>(table: Table<TData>, column: Column<TData>, layout?: DataGridPinLayout): number {
  const columns = getDataGridLayoutColumns(table);
  const REVERSE_STEP = 1;
  let offset = ZERO;

  for (let index = columns.length - REVERSE_STEP; index >= ZERO; index -= REVERSE_STEP) {
    const col = columns[index];
    if (col === undefined || col.id === column.id) {
      break;
    }
    if (col.getIsPinned() === "right") {
      offset += getDataGridColumnWidth(col);
    }
  }

  if (layout !== undefined) {
    offset += Math.max(ZERO, layout.tableClientWidth - layout.tableWidth);
  }

  return offset;
}

export function getDataGridPinOffset<TData extends RowData>(input: DataGridPinOffsetInput<TData>): number | undefined {
  const { column, isPinned, layout, table } = input;
  if (isPinned === false) {
    return undefined;
  }

  const columns = getDataGridLayoutColumns(table);

  if (isPinned === "left") {
    let offset = ZERO;
    for (const col of columns) {
      if (col.id === column.id) {
        break;
      }
      if (col.getIsPinned() === "left") {
        offset += getDataGridColumnWidth(col);
      }
    }
    return offset;
  }

  return getDataGridRightPinOffset(table, column, layout);
}
