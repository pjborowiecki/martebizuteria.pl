import { type ColumnSizingState, type ColumnVisibilityState } from "@tanstack/react-table"

import {
  clearDataGridColumnSizingCssVars,
  syncDataGridColumnSizingCssVars,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-width"
import {
  DATAGRID_UTILITY_COLUMN_IDS,
  clampDataGridColumnSizing,
  omitNonResizableColumnSizing,
  sameOrder,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

export const STORAGE_PREFIX = "marte:datagrid:v1:"

const LEGACY_RECORD_ID_COLUMN_KEY = "id"

const RECORD_ID_COLUMN_KEY = "recordId"

const LEGACY_ATTRIBUTE_TITLE_COLUMN_KEY = "handle"

const ATTRIBUTE_TITLE_COLUMN_KEY = "title"

const migrateLegacyColumnPreferenceKey = (columnId: string, canonical: ReadonlySet<string>): string => {
  if (columnId === LEGACY_RECORD_ID_COLUMN_KEY && canonical.has(RECORD_ID_COLUMN_KEY)) {
    return RECORD_ID_COLUMN_KEY
  }

  if (columnId === LEGACY_ATTRIBUTE_TITLE_COLUMN_KEY && canonical.has(ATTRIBUTE_TITLE_COLUMN_KEY)) {
    return ATTRIBUTE_TITLE_COLUMN_KEY
  }

  return columnId
}

const skipLegacyColumnSizingMigration = (sourceId: string, migratedId: string): boolean =>
  sourceId === LEGACY_ATTRIBUTE_TITLE_COLUMN_KEY && migratedId === ATTRIBUTE_TITLE_COLUMN_KEY

const dedupeColumnOrder = (order: readonly string[]): string[] => {
  const seen = new Set<string>()

  return order.filter((columnId) => {
    if (seen.has(columnId)) {
      return false
    }
    seen.add(columnId)

    return true
  })
}

export interface DataGridPreferencesSnapshot {
  readonly columnOrder: readonly string[]
  readonly columnSizing: ColumnSizingState
  readonly columnVisibility: ColumnVisibilityState
}

interface StoredDataGridPreferences {
  readonly columnOrder?: readonly string[]
  readonly columnSizing?: ColumnSizingState
  readonly columnVisibility?: ColumnVisibilityState
}

export const dataGridPreferencesStorageKey = (persistenceKey: string): string => `${STORAGE_PREFIX}${persistenceKey}`

export const readDataGridPreferences = (persistenceKey: string): StoredDataGridPreferences | undefined => {
  try {
    if (typeof localStorage === "undefined") {
      return undefined
    }

    const raw = localStorage.getItem(dataGridPreferencesStorageKey(persistenceKey))
    if (raw === null || raw === "") {
      return undefined
    }

    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object") {
      return undefined
    }

    return parsed
  } catch {
    return undefined
  }
}

export const writeDataGridPreferences = (
  persistenceKey: string,
  snapshot: DataGridPreferencesSnapshot,
  columnMaxSizes: Readonly<Record<string, number>> = {},
): void => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(dataGridPreferencesStorageKey(persistenceKey), JSON.stringify(snapshot))
    }
    syncDataGridColumnSizingCssVars({
      columnIds: snapshot.columnOrder,
      columnMaxSizes,
      persistenceKey,
      sizing: snapshot.columnSizing,
    })
  } catch {}
}

export const clearDataGridPreferences = (persistenceKey: string, columnIds: readonly string[] = []): void => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(dataGridPreferencesStorageKey(persistenceKey))
  }
  clearDataGridColumnSizingCssVars(persistenceKey, columnIds)
}

export interface DataGridColumnPinningOrder {
  readonly start?: readonly string[]
  readonly end?: readonly string[]
}

const findInsertIndexForMissingColumn = (next: readonly string[], canonical: readonly string[], canonicalIndex: number): number => {
  let insertAt = next.length

  for (let probe = canonicalIndex - 1; probe >= 0; probe -= 1) {
    const anchorId = canonical[probe]
    if (anchorId !== undefined) {
      insertAt = next.indexOf(anchorId) + 1
      break
    }
  }

  return insertAt
}

const insertMissingColumnsAtCanonicalPositions = (order: readonly string[], canonical: readonly string[]): string[] => {
  let next = [...order]

  for (let canonicalIndex = 0; canonicalIndex < canonical.length; canonicalIndex += 1) {
    const columnId = canonical[canonicalIndex]
    if (columnId !== undefined && !next.includes(columnId)) {
      const insertAt = findInsertIndexForMissingColumn(next, canonical, canonicalIndex)
      next = [...next.slice(0, insertAt), columnId, ...next.slice(insertAt)]
    }
  }

  return next
}

export const sanitizeColumnOrder = (
  saved: readonly string[] | undefined,
  canonical: readonly string[],
  pinning: DataGridColumnPinningOrder = {},
): string[] => {
  if (saved === undefined || saved.length === 0) {
    return orderColumnsForPinning([...canonical], pinning)
  }

  const canonicalSet = new Set(canonical)
  const migrated = dedupeColumnOrder(saved.map((id) => migrateLegacyColumnPreferenceKey(id, canonicalSet)))
  const filtered = migrated.filter((id) => canonicalSet.has(id))
  const withMissing = insertMissingColumnsAtCanonicalPositions(filtered, canonical)

  return orderColumnsForPinning(withMissing, pinning)
}

const orderColumnsForPinning = (order: readonly string[], pinning: DataGridColumnPinningOrder): string[] => {
  const { start = [], end = [] } = pinning
  const leftIds = new Set(start)
  const rightIds = new Set(end)

  if (leftIds.size === 0 && rightIds.size === 0) {
    return [...order]
  }

  const leftColumns = order.filter((id) => leftIds.has(id))
  const rightColumns = order.filter((id) => rightIds.has(id))
  const centerColumns = order.filter((id) => !leftIds.has(id) && !rightIds.has(id))

  return [...leftColumns, ...centerColumns, ...rightColumns]
}

export interface DataGridColumnSizingSanitizeInput {
  readonly columnIds: readonly string[]
  readonly columnMaxSizes?: Readonly<Record<string, number>>
  readonly columnMinSizes?: Readonly<Record<string, number>>
  readonly lockedColumnIds?: readonly string[]
  readonly saved: ColumnSizingState | undefined
}

export const sanitizeColumnSizing = ({
  columnIds,
  columnMaxSizes = {},
  columnMinSizes = {},
  lockedColumnIds = [],
  saved,
}: DataGridColumnSizingSanitizeInput): ColumnSizingState => {
  if (saved === undefined) {
    return {}
  }

  const allowed = new Set(columnIds)
  const fixed = new Set([...lockedColumnIds, ...DATAGRID_UTILITY_COLUMN_IDS])
  const next: ColumnSizingState = {}

  for (const [id, size] of Object.entries(saved)) {
    const columnId = migrateLegacyColumnPreferenceKey(id, allowed)
    if (
      !skipLegacyColumnSizingMigration(id, columnId) &&
      allowed.has(columnId) &&
      !fixed.has(columnId) &&
      typeof size === "number" &&
      Number.isFinite(size) &&
      size > 0 &&
      next[columnId] === undefined
    ) {
      const minSize = columnMinSizes[columnId]
      next[columnId] = minSize === undefined ? size : Math.max(size, minSize)
    }
  }

  return clampDataGridColumnSizing(next, columnMinSizes, columnMaxSizes)
}

export interface SanitizeColumnVisibilityInput {
  readonly columnIds: readonly string[]
  readonly defaults?: ColumnVisibilityState
  readonly forcedHiddenColumnIds?: readonly string[]
  readonly saved?: ColumnVisibilityState | undefined
}

export const sanitizeColumnVisibility = ({
  columnIds,
  defaults = {},
  forcedHiddenColumnIds = [],
  saved,
}: SanitizeColumnVisibilityInput): ColumnVisibilityState => {
  const allowed = new Set(columnIds)
  const next: ColumnVisibilityState = {}

  if (saved !== undefined) {
    for (const [id, visible] of Object.entries(saved)) {
      const columnId = migrateLegacyColumnPreferenceKey(id, allowed)
      if (allowed.has(columnId) && typeof visible === "boolean" && next[columnId] === undefined) {
        next[columnId] = visible
      }
    }
  }

  for (const [id, visible] of Object.entries(defaults)) {
    if (allowed.has(id) && next[id] === undefined) {
      next[id] = visible
    }
  }

  for (const columnId of forcedHiddenColumnIds) {
    if (allowed.has(columnId)) {
      next[columnId] = false
    }
  }

  for (const columnId of DATAGRID_UTILITY_COLUMN_IDS) {
    if (allowed.has(columnId)) {
      next[columnId] = true
    }
  }

  return next
}

const columnVisibleByDefault = (columnVisibility: ColumnVisibilityState, columnId: string, defaults: ColumnVisibilityState): boolean => {
  const explicit = columnVisibility[columnId]
  if (explicit !== undefined) {
    return explicit
  }

  const defaultVisibility = defaults[columnId]

  return defaultVisibility ?? true
}

const hasColumnVisibilityOverrides = (columnVisibility: ColumnVisibilityState, defaults: ColumnVisibilityState): boolean => {
  const columnIds = new Set([...Object.keys(columnVisibility), ...Object.keys(defaults)])

  for (const id of columnIds) {
    if (columnVisibleByDefault(columnVisibility, id, defaults) !== columnVisibleByDefault(defaults, id, defaults)) {
      return true
    }
  }

  return false
}

export interface HasDataGridPreferenceOverridesInput {
  readonly canonicalOrder: readonly string[]
  readonly current: DataGridPreferencesSnapshot
  readonly defaultColumnVisibility?: ColumnVisibilityState
  readonly pinning?: DataGridColumnPinningOrder
}

export const hasDataGridPreferenceOverrides = ({
  canonicalOrder,
  current,
  defaultColumnVisibility = {},
  pinning = {},
}: HasDataGridPreferenceOverridesInput): boolean => {
  const defaultSnapshot = defaultPreferencesSnapshot(canonicalOrder, defaultColumnVisibility, pinning)

  if (!sameOrder(current.columnOrder, defaultSnapshot.columnOrder)) {
    return true
  }

  if (Object.keys(current.columnSizing).length > 0) {
    return true
  }

  return hasColumnVisibilityOverrides(current.columnVisibility, defaultColumnVisibility)
}

export interface PersistDataGridPreferencesInput {
  readonly canonicalOrder: readonly string[]
  readonly columnMaxSizes?: Readonly<Record<string, number>>
  readonly columnPinning?: DataGridColumnPinningOrder
  readonly defaultColumnVisibility?: ColumnVisibilityState
  readonly lockedColumnIds?: readonly string[]
  readonly persistenceKey: string
  readonly snapshot: DataGridPreferencesSnapshot
}

export const persistDataGridPreferences = ({
  canonicalOrder,
  columnMaxSizes = {},
  columnPinning = { end: [], start: [] },
  defaultColumnVisibility = {},
  lockedColumnIds = [],
  persistenceKey,
  snapshot,
}: PersistDataGridPreferencesInput): void => {
  const prepared = prepareDataGridPreferencesSnapshot(snapshot, lockedColumnIds)

  if (!hasDataGridPreferenceOverrides({ canonicalOrder, current: prepared, defaultColumnVisibility, pinning: columnPinning })) {
    clearDataGridPreferences(persistenceKey, canonicalOrder)

    return
  }

  writeDataGridPreferences(persistenceKey, prepared, columnMaxSizes)
}

export const defaultPreferencesSnapshot = (
  canonicalOrder: readonly string[],
  defaultColumnVisibility: ColumnVisibilityState = {},
  pinning: DataGridColumnPinningOrder = {},
): DataGridPreferencesSnapshot => ({
  columnOrder: sanitizeColumnOrder(undefined, canonicalOrder, pinning),
  columnSizing: {},
  columnVisibility: sanitizeColumnVisibility({ columnIds: canonicalOrder, defaults: defaultColumnVisibility }),
})

export interface DataGridPreferencesLoadInput {
  readonly canonicalOrder: readonly string[]
  readonly columnMaxSizes?: Readonly<Record<string, number>>
  readonly columnMinSizes?: Readonly<Record<string, number>>
  readonly columnPinning?: DataGridColumnPinningOrder
  readonly defaultColumnVisibility?: ColumnVisibilityState
  readonly forcedHiddenColumnIds?: readonly string[]
  readonly lockedColumnIds?: readonly string[]
  readonly persistenceKey: string
}

export const loadDataGridPreferences = ({
  canonicalOrder,
  columnMaxSizes = {},
  columnMinSizes = {},
  columnPinning = { end: [], start: [] },
  defaultColumnVisibility = {},
  forcedHiddenColumnIds = [],
  lockedColumnIds = [],
  persistenceKey,
}: DataGridPreferencesLoadInput): DataGridPreferencesSnapshot => {
  const stored = readDataGridPreferences(persistenceKey)
  const columnSizing = sanitizeColumnSizing({
    columnIds: canonicalOrder,
    columnMaxSizes,
    columnMinSizes,
    lockedColumnIds,
    saved: stored?.columnSizing,
  })

  syncDataGridColumnSizingCssVars({
    columnIds: canonicalOrder,
    columnMaxSizes,
    persistenceKey,
    sizing: columnSizing,
  })

  return {
    columnOrder: sanitizeColumnOrder(stored?.columnOrder, canonicalOrder, columnPinning),
    columnSizing,
    columnVisibility: sanitizeColumnVisibility({
      columnIds: canonicalOrder,
      defaults: defaultColumnVisibility,
      forcedHiddenColumnIds,
      saved: stored?.columnVisibility,
    }),
  }
}

export const prepareDataGridPreferencesSnapshot = (
  snapshot: DataGridPreferencesSnapshot,
  lockedColumnIds: readonly string[],
): DataGridPreferencesSnapshot => ({
  ...snapshot,
  columnSizing: omitNonResizableColumnSizing(snapshot.columnSizing, lockedColumnIds),
})

const sameColumnSizing = (left: ColumnSizingState, right: ColumnSizingState): boolean => {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => left[key] === right[key])
}

const sameColumnVisibility = (left: ColumnVisibilityState, right: ColumnVisibilityState): boolean => {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => left[key] === right[key])
}

export const sameDataGridPreferencesSnapshot = (left: DataGridPreferencesSnapshot, right: DataGridPreferencesSnapshot): boolean =>
  sameOrder(left.columnOrder, right.columnOrder) &&
  sameColumnSizing(left.columnSizing, right.columnSizing) &&
  sameColumnVisibility(left.columnVisibility, right.columnVisibility)
