import { type RefObject, useEffect, useRef } from "react"

import { type ColumnPinningState, type ColumnVisibilityState } from "@tanstack/react-table"

import {
  type DataGridPreferencesSnapshot,
  persistDataGridPreferences,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"

const PERSIST_DEBOUNCE_MS = 300

interface UseDataGridPersistEffectsOptions {
  readonly canonicalOrder: readonly string[]
  readonly columnMaxSizesRef: RefObject<Readonly<Record<string, number>>>
  readonly columnPinning: ColumnPinningState
  readonly defaultColumnVisibility: ColumnVisibilityState
  readonly lockedColumnIds: readonly string[]
  readonly persistenceKey: string
  readonly skipPersistRef: { current: boolean }
  readonly snapshot: DataGridPreferencesSnapshot
  readonly snapshotRef: RefObject<DataGridPreferencesSnapshot>
}

export const useDataGridPersistEffects = ({
  canonicalOrder,
  columnMaxSizesRef,
  columnPinning,
  defaultColumnVisibility,
  lockedColumnIds,
  persistenceKey,
  skipPersistRef,
  snapshot,
  snapshotRef,
}: UseDataGridPersistEffectsOptions): RefObject<ReturnType<typeof globalThis.setTimeout> | undefined> => {
  const persistTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false

      return
    }

    persistTimerRef.current = globalThis.setTimeout(() => {
      persistTimerRef.current = undefined
      persistDataGridPreferences({
        canonicalOrder,
        columnMaxSizes: columnMaxSizesRef.current,
        columnPinning,
        defaultColumnVisibility,
        lockedColumnIds,
        persistenceKey,
        snapshot,
      })
    }, PERSIST_DEBOUNCE_MS)

    return () => {
      if (persistTimerRef.current !== undefined) {
        globalThis.clearTimeout(persistTimerRef.current)
        persistTimerRef.current = undefined
      }
    }
  }, [canonicalOrder, columnMaxSizesRef, columnPinning, defaultColumnVisibility, lockedColumnIds, persistenceKey, skipPersistRef, snapshot])

  useEffect(() => {
    const flush = (): void => {
      persistDataGridPreferences({
        canonicalOrder,
        columnMaxSizes: columnMaxSizesRef.current,
        columnPinning,
        defaultColumnVisibility,
        lockedColumnIds,
        persistenceKey,
        snapshot: snapshotRef.current,
      })
    }

    globalThis.addEventListener("beforeunload", flush)
    globalThis.addEventListener("pagehide", flush)

    return () => {
      globalThis.removeEventListener("beforeunload", flush)
      globalThis.removeEventListener("pagehide", flush)
    }
  }, [canonicalOrder, columnMaxSizesRef, columnPinning, defaultColumnVisibility, lockedColumnIds, persistenceKey, snapshotRef])

  return persistTimerRef
}
