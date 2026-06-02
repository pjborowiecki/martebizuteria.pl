import type { ColumnSizingState, VisibilityState } from "@tanstack/react-table";

import {
  applyDataGridColumnSizingCssVars,
  clearDataGridColumnSizingCssVars
} from "~/src/components/custom/datagrid/lib/data-grid-column-width";
import { DATAGRID_UTILITY_COLUMN_IDS, omitNonResizableColumnSizing, sameOrder } from "~/src/components/custom/datagrid/lib/data-grid.utils";

export const STORAGE_PREFIX = "marte:datagrid:v1:";
const EMPTY = 0;
const MIN_SAVED_COLUMN_SIZE = 0;

export interface DataGridPreferencesSnapshot {
  readonly columnOrder: readonly string[];
  readonly columnSizing: ColumnSizingState;
  readonly columnVisibility: VisibilityState;
}

interface StoredDataGridPreferences {
  readonly columnOrder?: readonly string[];
  readonly columnSizing?: ColumnSizingState;
  readonly columnVisibility?: VisibilityState;
}

export function dataGridPreferencesStorageKey(persistenceKey: string): string {
  return `${STORAGE_PREFIX}${persistenceKey}`;
}

export function readDataGridPreferences(persistenceKey: string): StoredDataGridPreferences | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(dataGridPreferencesStorageKey(persistenceKey)) ?? undefined;
    if (raw === undefined || raw === "") {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as StoredDataGridPreferences;
  } catch {
    return undefined;
  }
}

export function writeDataGridPreferences(persistenceKey: string, snapshot: DataGridPreferencesSnapshot): void {
  try {
    globalThis.localStorage?.setItem(dataGridPreferencesStorageKey(persistenceKey), JSON.stringify(snapshot));
    applyDataGridColumnSizingCssVars(persistenceKey, snapshot.columnSizing);
  } catch {
    // Quota or private mode: persistence is best-effort.
  }
}

export function clearDataGridPreferences(persistenceKey: string, columnIds: readonly string[] = []): void {
  globalThis.localStorage?.removeItem(dataGridPreferencesStorageKey(persistenceKey));
  clearDataGridColumnSizingCssVars(persistenceKey, columnIds);
}

/** Keeps saved order for known columns and appends any new columns from the canonical list. */
export function sanitizeColumnOrder(saved: readonly string[] | undefined, canonical: readonly string[]): string[] {
  if (saved === undefined || saved.length === EMPTY) {
    return [...canonical];
  }

  const canonicalSet = new Set(canonical);
  const ordered = saved.filter((id) => canonicalSet.has(id));

  for (const id of canonical) {
    if (!ordered.includes(id)) {
      ordered.push(id);
    }
  }

  return ordered;
}

export interface DataGridColumnSizingSanitizeInput {
  readonly columnIds: readonly string[];
  readonly columnMinSizes?: Readonly<Record<string, number>>;
  readonly lockedColumnIds?: readonly string[];
  readonly saved: ColumnSizingState | undefined;
}

export function sanitizeColumnSizing({
  columnIds,
  columnMinSizes = {},
  lockedColumnIds = [],
  saved
}: DataGridColumnSizingSanitizeInput): ColumnSizingState {
  if (saved === undefined) {
    return {};
  }

  const allowed = new Set(columnIds);
  const fixed = new Set([...lockedColumnIds, ...DATAGRID_UTILITY_COLUMN_IDS]);
  const next: ColumnSizingState = {};

  for (const [id, size] of Object.entries(saved)) {
    if (allowed.has(id) && !fixed.has(id) && typeof size === "number" && Number.isFinite(size) && size > MIN_SAVED_COLUMN_SIZE) {
      const minSize = columnMinSizes[id];
      next[id] = minSize === undefined ? size : Math.max(size, minSize);
    }
  }

  return next;
}

export function sanitizeColumnVisibility(saved: VisibilityState | undefined, columnIds: readonly string[]): VisibilityState {
  if (saved === undefined) {
    return {};
  }

  const allowed = new Set(columnIds);
  const next: VisibilityState = {};

  for (const [id, visible] of Object.entries(saved)) {
    if (allowed.has(id) && typeof visible === "boolean") {
      next[id] = visible;
    }
  }

  return next;
}

export function hasDataGridPreferenceOverrides(current: DataGridPreferencesSnapshot, canonicalOrder: readonly string[]): boolean {
  if (!sameOrder(current.columnOrder, canonicalOrder)) {
    return true;
  }

  if (Object.keys(current.columnSizing).length > EMPTY) {
    return true;
  }

  return Object.values(current.columnVisibility).some((visible) => !visible);
}

export function defaultPreferencesSnapshot(canonicalOrder: readonly string[]): DataGridPreferencesSnapshot {
  return {
    columnOrder: [...canonicalOrder],
    columnSizing: {},
    columnVisibility: {}
  };
}

export interface DataGridPreferencesLoadInput {
  readonly canonicalOrder: readonly string[];
  readonly columnMinSizes?: Readonly<Record<string, number>>;
  readonly lockedColumnIds?: readonly string[];
  readonly persistenceKey: string;
}

export function loadDataGridPreferences({
  canonicalOrder,
  columnMinSizes = {},
  lockedColumnIds = [],
  persistenceKey
}: DataGridPreferencesLoadInput): DataGridPreferencesSnapshot {
  const stored = readDataGridPreferences(persistenceKey);

  return {
    columnOrder: sanitizeColumnOrder(stored?.columnOrder, canonicalOrder),
    columnSizing: sanitizeColumnSizing({
      columnIds: canonicalOrder,
      columnMinSizes,
      lockedColumnIds,
      saved: stored?.columnSizing
    }),
    columnVisibility: sanitizeColumnVisibility(stored?.columnVisibility, canonicalOrder)
  };
}

export function prepareDataGridPreferencesSnapshot(
  snapshot: DataGridPreferencesSnapshot,
  lockedColumnIds: readonly string[]
): DataGridPreferencesSnapshot {
  return {
    ...snapshot,
    columnSizing: omitNonResizableColumnSizing(snapshot.columnSizing, lockedColumnIds)
  };
}
