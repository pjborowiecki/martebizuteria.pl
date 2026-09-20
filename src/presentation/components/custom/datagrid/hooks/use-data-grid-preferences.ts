import { useCallback, useMemo, useRef } from "react"

import { type ColumnPinningState, type ColumnSizingState, type ColumnVisibilityState } from "@tanstack/react-table"

import { useDataGridPersistEffects } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-persist-effects"
import { useDataGridPreferencesSnapshot } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-preferences-snapshot"
import { useStableColumnPinning } from "~/src/presentation/components/custom/datagrid/hooks/use-stable-column-pinning"
import {
  clearDataGridPreferences,
  defaultPreferencesSnapshot,
  hasDataGridPreferenceOverrides,
  sanitizeColumnVisibility,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"
import { clampDataGridColumnSizing, omitNonResizableColumnSizing } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

export interface UseDataGridPreferencesOptions {
  readonly columnMaxSizes: Readonly<Record<string, number>>
  readonly columnMinSizes: Readonly<Record<string, number>>
  readonly columnPinning?: ColumnPinningState | undefined
  readonly defaultColumnVisibility?: ColumnVisibilityState | undefined
  readonly forcedHiddenColumnIds?: readonly string[] | undefined
  readonly initialColumnOrder: readonly string[]
  readonly nonResizableColumnIds: readonly string[]
  readonly persistenceKey: string
}

export interface DataGridPreferencesApi {
  readonly columnOrder: string[]
  readonly columnSizing: ColumnSizingState
  readonly columnVisibility: ColumnVisibilityState
  readonly hasPreferenceOverrides: boolean
  readonly resetPreferences: () => void
  readonly setColumnOrder: (updater: string[] | ((current: string[]) => string[])) => void
  readonly setColumnSizing: (updater: ColumnSizingState | ((current: ColumnSizingState) => ColumnSizingState)) => void
  readonly setColumnVisibility: (updater: ColumnVisibilityState | ((current: ColumnVisibilityState) => ColumnVisibilityState)) => void
}

/**
 * Per-table layout preferences (order, widths, visibility) backed by localStorage.
 * Client `getSnapshot` reads the preferences store (hydrated from localStorage on first use).
 */
export const useDataGridPreferences = ({
  columnMaxSizes,
  columnMinSizes,
  columnPinning = { end: [], start: [] },
  defaultColumnVisibility = {},
  forcedHiddenColumnIds = [],
  initialColumnOrder,
  nonResizableColumnIds,
  persistenceKey,
}: UseDataGridPreferencesOptions): DataGridPreferencesApi => {
  const canonicalOrder = useMemo(() => [...initialColumnOrder], [initialColumnOrder])
  const stableColumnPinning = useStableColumnPinning(columnPinning)
  const lockedColumnIds = useMemo(() => [...nonResizableColumnIds], [nonResizableColumnIds])
  const columnMinSizesRef = useRef(columnMinSizes)
  columnMinSizesRef.current = columnMinSizes
  const columnMaxSizesRef = useRef(columnMaxSizes)
  columnMaxSizesRef.current = columnMaxSizes

  const { getStore, snapshot } = useDataGridPreferencesSnapshot({
    canonicalOrder,
    columnMaxSizes,
    columnMinSizes,
    columnPinning: stableColumnPinning,
    defaultColumnVisibility,
    forcedHiddenColumnIds,
    lockedColumnIds,
    persistenceKey,
  })

  const skipPersistRef = useRef(true)
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  const persistTimerRef = useDataGridPersistEffects({
    canonicalOrder,
    columnMaxSizesRef,
    columnPinning: stableColumnPinning,
    defaultColumnVisibility,
    lockedColumnIds,
    persistenceKey,
    skipPersistRef,
    snapshot,
    snapshotRef,
  })

  const setColumnOrder = useCallback(
    (updater: string[] | ((current: string[]) => string[])) => {
      const current = getStore().getSnapshot()
      const nextOrder = typeof updater === "function" ? updater([...current.columnOrder]) : updater
      getStore().setSnapshot({ ...current, columnOrder: nextOrder })
    },
    [getStore],
  )

  const setColumnSizing = useCallback(
    (updater: ColumnSizingState | ((current: ColumnSizingState) => ColumnSizingState)) => {
      const current = getStore().getSnapshot()
      const cleaned = omitNonResizableColumnSizing(current.columnSizing, lockedColumnIds)
      const nextSizing = typeof updater === "function" ? updater(cleaned) : updater
      getStore().setSnapshot({
        ...current,
        columnSizing: clampDataGridColumnSizing(
          omitNonResizableColumnSizing(nextSizing, lockedColumnIds),
          columnMinSizesRef.current,
          columnMaxSizesRef.current,
        ),
      })
    },
    [getStore, lockedColumnIds],
  )

  const setColumnVisibility = useCallback(
    (updater: ColumnVisibilityState | ((current: ColumnVisibilityState) => ColumnVisibilityState)) => {
      const current = getStore().getSnapshot()
      const rawVisibility = typeof updater === "function" ? updater(current.columnVisibility) : updater
      const nextVisibility = sanitizeColumnVisibility({
        columnIds: canonicalOrder,
        defaults: defaultColumnVisibility,
        forcedHiddenColumnIds,
        saved: rawVisibility,
      })
      getStore().setSnapshot({ ...current, columnVisibility: nextVisibility })
    },
    [canonicalOrder, defaultColumnVisibility, forcedHiddenColumnIds, getStore],
  )

  const resetPreferences = useCallback(() => {
    if (persistTimerRef.current !== undefined) {
      globalThis.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = undefined
    }

    clearDataGridPreferences(persistenceKey, canonicalOrder)
    skipPersistRef.current = true
    getStore().setSnapshot(defaultPreferencesSnapshot(canonicalOrder, defaultColumnVisibility, stableColumnPinning))
  }, [canonicalOrder, defaultColumnVisibility, getStore, persistenceKey, persistTimerRef, stableColumnPinning])

  const hasPreferenceOverrides = useMemo(
    () =>
      hasDataGridPreferenceOverrides({
        canonicalOrder,
        current: snapshot,
        defaultColumnVisibility,
        pinning: stableColumnPinning,
      }),
    [canonicalOrder, defaultColumnVisibility, snapshot, stableColumnPinning],
  )

  return {
    columnOrder: [...snapshot.columnOrder],
    columnSizing: snapshot.columnSizing,
    columnVisibility: snapshot.columnVisibility,
    hasPreferenceOverrides,
    resetPreferences,
    setColumnOrder,
    setColumnSizing,
    setColumnVisibility,
  }
}
