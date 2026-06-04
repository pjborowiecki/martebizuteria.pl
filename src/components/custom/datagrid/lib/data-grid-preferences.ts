import type { ColumnSizingState, VisibilityState } from "@tanstack/react-table";

import {
  clearDataGridColumnSizingCssVars,
  syncDataGridColumnSizingCssVars
} from "~/src/components/custom/datagrid/lib/data-grid-column-width";
import {
  clampDataGridColumnSizing,
  DATAGRID_UTILITY_COLUMN_IDS,
  omitNonResizableColumnSizing,
  sameOrder
} from "~/src/components/custom/datagrid/lib/data-grid.utils";

export const STORAGE_PREFIX = "marte:datagrid:v1:";
const EMPTY = 0;
const NOT_FOUND_INDEX = -1;
const STEP_ONE = 1;
const MIN_SAVED_COLUMN_SIZE = 0;
/** TanStack row ids also use `id`; catalog tables renamed this column to `recordId`. */
const LEGACY_RECORD_ID_COLUMN_KEY = "id";
const RECORD_ID_COLUMN_KEY = "recordId";
/** Attributes table renamed the title column from `handle` to `title`. */
const LEGACY_ATTRIBUTE_TITLE_COLUMN_KEY = "handle";
const ATTRIBUTE_TITLE_COLUMN_KEY = "title";

function migrateLegacyColumnPreferenceKey(columnId: string, canonical: ReadonlySet<string>): string {
  if (columnId === LEGACY_RECORD_ID_COLUMN_KEY && canonical.has(RECORD_ID_COLUMN_KEY)) {
    return RECORD_ID_COLUMN_KEY;
  }
  if (columnId === LEGACY_ATTRIBUTE_TITLE_COLUMN_KEY && canonical.has(ATTRIBUTE_TITLE_COLUMN_KEY)) {
    return ATTRIBUTE_TITLE_COLUMN_KEY;
  }
  return columnId;
}

/** Legacy attribute slug column width must not shrink the title column after `handle` → `title`. */
function skipLegacyColumnSizingMigration(sourceId: string, migratedId: string): boolean {
  return sourceId === LEGACY_ATTRIBUTE_TITLE_COLUMN_KEY && migratedId === ATTRIBUTE_TITLE_COLUMN_KEY;
}

function dedupeColumnOrder(order: readonly string[]): string[] {
  const seen = new Set<string>();
  return order.filter((columnId) => {
    if (seen.has(columnId)) {
      return false;
    }
    seen.add(columnId);
    return true;
  });
}

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

export function writeDataGridPreferences(
  persistenceKey: string,
  snapshot: DataGridPreferencesSnapshot,
  columnMaxSizes: Readonly<Record<string, number>> = {}
): void {
  try {
    globalThis.localStorage?.setItem(dataGridPreferencesStorageKey(persistenceKey), JSON.stringify(snapshot));
    syncDataGridColumnSizingCssVars({
      columnIds: snapshot.columnOrder,
      columnMaxSizes,
      persistenceKey,
      sizing: snapshot.columnSizing
    });
  } catch {
    // Quota or private mode: persistence is best-effort.
  }
}

export function clearDataGridPreferences(persistenceKey: string, columnIds: readonly string[] = []): void {
  globalThis.localStorage?.removeItem(dataGridPreferencesStorageKey(persistenceKey));
  clearDataGridColumnSizingCssVars(persistenceKey, columnIds);
}

export interface DataGridColumnPinningOrder {
  readonly left?: readonly string[];
  readonly right?: readonly string[];
}

function findInsertIndexForMissingColumn(next: readonly string[], canonical: readonly string[], canonicalIndex: number): number {
  let insertAt = next.length;

  for (let probe = canonicalIndex - STEP_ONE; probe >= EMPTY; probe -= STEP_ONE) {
    const anchorId = canonical[probe];
    if (anchorId !== undefined) {
      const anchorIndex = next.indexOf(anchorId);
      if (anchorIndex !== NOT_FOUND_INDEX) {
        insertAt = anchorIndex + STEP_ONE;
        break;
      }
    }
  }

  return insertAt;
}

/** Inserts columns that exist in `canonical` but not yet in `order`, at their definition index. */
function insertMissingColumnsAtCanonicalPositions(order: readonly string[], canonical: readonly string[]): string[] {
  let next = [...order];

  for (let canonicalIndex = 0; canonicalIndex < canonical.length; canonicalIndex += STEP_ONE) {
    const columnId = canonical[canonicalIndex];
    if (columnId !== undefined && !next.includes(columnId)) {
      const insertAt = findInsertIndexForMissingColumn(next, canonical, canonicalIndex);
      next = [...next.slice(EMPTY, insertAt), columnId, ...next.slice(insertAt)];
    }
  }

  return next;
}

/** Keeps saved order for known columns, inserts new ids at their def position, then groups for pinning. */
export function sanitizeColumnOrder(
  saved: readonly string[] | undefined,
  canonical: readonly string[],
  pinning: DataGridColumnPinningOrder = {}
): string[] {
  if (saved === undefined || saved.length === EMPTY) {
    return orderColumnsForPinning([...canonical], pinning);
  }

  const canonicalSet = new Set(canonical);
  const migrated = dedupeColumnOrder(saved.map((id) => migrateLegacyColumnPreferenceKey(id, canonicalSet)));
  const filtered = migrated.filter((id) => canonicalSet.has(id));
  const withMissing = insertMissingColumnsAtCanonicalPositions(filtered, canonical);

  return orderColumnsForPinning(withMissing, pinning);
}

function orderColumnsForPinning(order: readonly string[], pinning: DataGridColumnPinningOrder): string[] {
  const { left = [], right = [] } = pinning;
  const leftIds = new Set(left);
  const rightIds = new Set(right);

  if (leftIds.size === EMPTY && rightIds.size === EMPTY) {
    return [...order];
  }

  const leftColumns = order.filter((id) => leftIds.has(id));
  const rightColumns = order.filter((id) => rightIds.has(id));
  const centerColumns = order.filter((id) => !leftIds.has(id) && !rightIds.has(id));

  return [...leftColumns, ...centerColumns, ...rightColumns];
}

export interface DataGridColumnSizingSanitizeInput {
  readonly columnIds: readonly string[];
  readonly columnMaxSizes?: Readonly<Record<string, number>>;
  readonly columnMinSizes?: Readonly<Record<string, number>>;
  readonly lockedColumnIds?: readonly string[];
  readonly saved: ColumnSizingState | undefined;
}

export function sanitizeColumnSizing({
  columnIds,
  columnMaxSizes = {},
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
    const columnId = migrateLegacyColumnPreferenceKey(id, allowed);
    if (
      !skipLegacyColumnSizingMigration(id, columnId) &&
      allowed.has(columnId) &&
      !fixed.has(columnId) &&
      typeof size === "number" &&
      Number.isFinite(size) &&
      size > MIN_SAVED_COLUMN_SIZE &&
      next[columnId] === undefined
    ) {
      const minSize = columnMinSizes[columnId];
      next[columnId] = minSize === undefined ? size : Math.max(size, minSize);
    }
  }

  return clampDataGridColumnSizing(next, columnMinSizes, columnMaxSizes);
}

export interface SanitizeColumnVisibilityInput {
  readonly columnIds: readonly string[];
  readonly defaults?: VisibilityState;
  readonly forcedHiddenColumnIds?: readonly string[];
  readonly saved?: VisibilityState;
}

export function sanitizeColumnVisibility({
  columnIds,
  defaults = {},
  forcedHiddenColumnIds = [],
  saved
}: SanitizeColumnVisibilityInput): VisibilityState {
  const allowed = new Set(columnIds);
  const next: VisibilityState = {};

  if (saved !== undefined) {
    for (const [id, visible] of Object.entries(saved)) {
      const columnId = migrateLegacyColumnPreferenceKey(id, allowed);
      if (allowed.has(columnId) && typeof visible === "boolean" && next[columnId] === undefined) {
        next[columnId] = visible;
      }
    }
  }

  for (const [id, visible] of Object.entries(defaults)) {
    if (allowed.has(id) && next[id] === undefined) {
      next[id] = visible;
    }
  }

  for (const columnId of forcedHiddenColumnIds) {
    if (allowed.has(columnId)) {
      next[columnId] = false;
    }
  }

  for (const columnId of DATAGRID_UTILITY_COLUMN_IDS) {
    if (allowed.has(columnId)) {
      next[columnId] = true;
    }
  }

  return next;
}

function columnVisibleByDefault(columnVisibility: VisibilityState, columnId: string, defaults: VisibilityState): boolean {
  const explicit = columnVisibility[columnId];
  if (explicit !== undefined) {
    return explicit;
  }

  const defaultVisibility = defaults[columnId];
  return defaultVisibility ?? true;
}

function hasColumnVisibilityOverrides(columnVisibility: VisibilityState, defaults: VisibilityState): boolean {
  const columnIds = new Set([...Object.keys(columnVisibility), ...Object.keys(defaults)]);

  for (const id of columnIds) {
    if (columnVisibleByDefault(columnVisibility, id, defaults) !== columnVisibleByDefault(defaults, id, defaults)) {
      return true;
    }
  }

  return false;
}

export interface HasDataGridPreferenceOverridesInput {
  readonly canonicalOrder: readonly string[];
  readonly current: DataGridPreferencesSnapshot;
  readonly defaultColumnVisibility?: VisibilityState;
  readonly pinning?: DataGridColumnPinningOrder;
}

export function hasDataGridPreferenceOverrides({
  canonicalOrder,
  current,
  defaultColumnVisibility = {},
  pinning = {}
}: HasDataGridPreferenceOverridesInput): boolean {
  const defaultSnapshot = defaultPreferencesSnapshot(canonicalOrder, defaultColumnVisibility, pinning);

  if (!sameOrder(current.columnOrder, defaultSnapshot.columnOrder)) {
    return true;
  }

  if (Object.keys(current.columnSizing).length > EMPTY) {
    return true;
  }

  return hasColumnVisibilityOverrides(current.columnVisibility, defaultColumnVisibility);
}

export interface PersistDataGridPreferencesInput {
  readonly canonicalOrder: readonly string[];
  readonly columnMaxSizes?: Readonly<Record<string, number>>;
  readonly columnPinning?: DataGridColumnPinningOrder;
  readonly defaultColumnVisibility?: VisibilityState;
  readonly lockedColumnIds?: readonly string[];
  readonly persistenceKey: string;
  readonly snapshot: DataGridPreferencesSnapshot;
}

/** Writes layout prefs when they differ from defaults; clears storage when layout matches defaults. */
export function persistDataGridPreferences({
  canonicalOrder,
  columnMaxSizes = {},
  columnPinning = {},
  defaultColumnVisibility = {},
  lockedColumnIds = [],
  persistenceKey,
  snapshot
}: PersistDataGridPreferencesInput): void {
  const prepared = prepareDataGridPreferencesSnapshot(snapshot, lockedColumnIds);

  if (!hasDataGridPreferenceOverrides({ canonicalOrder, current: prepared, defaultColumnVisibility, pinning: columnPinning })) {
    clearDataGridPreferences(persistenceKey, canonicalOrder);
    return;
  }

  writeDataGridPreferences(persistenceKey, prepared, columnMaxSizes);
}

export function defaultPreferencesSnapshot(
  canonicalOrder: readonly string[],
  defaultColumnVisibility: VisibilityState = {},
  pinning: DataGridColumnPinningOrder = {}
): DataGridPreferencesSnapshot {
  return {
    columnOrder: sanitizeColumnOrder(undefined, canonicalOrder, pinning),
    columnSizing: {},
    columnVisibility: sanitizeColumnVisibility({ columnIds: canonicalOrder, defaults: defaultColumnVisibility })
  };
}

export interface DataGridPreferencesLoadInput {
  readonly canonicalOrder: readonly string[];
  readonly columnMaxSizes?: Readonly<Record<string, number>>;
  readonly columnMinSizes?: Readonly<Record<string, number>>;
  readonly columnPinning?: DataGridColumnPinningOrder;
  readonly defaultColumnVisibility?: VisibilityState;
  readonly forcedHiddenColumnIds?: readonly string[];
  readonly lockedColumnIds?: readonly string[];
  readonly persistenceKey: string;
}

export function loadDataGridPreferences({
  canonicalOrder,
  columnMaxSizes = {},
  columnMinSizes = {},
  columnPinning = {},
  defaultColumnVisibility = {},
  forcedHiddenColumnIds = [],
  lockedColumnIds = [],
  persistenceKey
}: DataGridPreferencesLoadInput): DataGridPreferencesSnapshot {
  const stored = readDataGridPreferences(persistenceKey);
  const columnSizing = sanitizeColumnSizing({
    columnIds: canonicalOrder,
    columnMaxSizes,
    columnMinSizes,
    lockedColumnIds,
    saved: stored?.columnSizing
  });

  syncDataGridColumnSizingCssVars({
    columnIds: canonicalOrder,
    columnMaxSizes,
    persistenceKey,
    sizing: columnSizing
  });

  return {
    columnOrder: sanitizeColumnOrder(stored?.columnOrder, canonicalOrder, columnPinning),
    columnSizing,
    columnVisibility: sanitizeColumnVisibility({
      columnIds: canonicalOrder,
      defaults: defaultColumnVisibility,
      forcedHiddenColumnIds,
      saved: stored?.columnVisibility
    })
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

function sameColumnSizing(a: ColumnSizingState, b: ColumnSizingState): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => a[key] === b[key]);
}

function sameColumnVisibility(a: VisibilityState, b: VisibilityState): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => a[key] === b[key]);
}

export function sameDataGridPreferencesSnapshot(a: DataGridPreferencesSnapshot, b: DataGridPreferencesSnapshot): boolean {
  return (
    sameOrder(a.columnOrder, b.columnOrder) &&
    sameColumnSizing(a.columnSizing, b.columnSizing) &&
    sameColumnVisibility(a.columnVisibility, b.columnVisibility)
  );
}
