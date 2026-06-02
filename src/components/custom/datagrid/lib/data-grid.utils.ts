import type { Column, ColumnDef, ColumnSizingState, RowData, Table } from "@tanstack/react-table";

import { getDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid-column-widths";

const NOT_FOUND_INDEX = -1;
const REMOVE_ONE = 1;
const NO_DELETE = 0;
const ZERO = 0;

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

/** Ids of columns with `enableResizing: false` — excluded from persisted sizing. */
export function getNonResizableColumnIds<TData extends RowData>(columns: ColumnDef<TData>[]): string[] {
  return columns.flatMap((column) => {
    if (column.enableResizing !== false) {
      return [];
    }
    const id = getColumnDefId(column);
    return id === undefined ? [] : [id];
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

function getDataGridRightPinOffset<TData extends RowData>(table: Table<TData>, column: Column<TData>, layout?: DataGridPinLayout): number {
  const columns = table.getVisibleLeafColumns();
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

  const columns = table.getVisibleLeafColumns();

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
