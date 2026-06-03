import { type RefObject, useEffect, useRef } from "react";

import type { ColumnPinningState, VisibilityState } from "@tanstack/react-table";

import { type DataGridPreferencesSnapshot, persistDataGridPreferences } from "~/src/components/custom/datagrid/lib/data-grid-preferences";

const PERSIST_DEBOUNCE_MS = 300;
const INITIAL_PERSIST_TIMER: ReturnType<typeof globalThis.setTimeout> | undefined = void 0;

interface UseDataGridPersistEffectsOptions {
  readonly canonicalOrder: readonly string[];
  readonly columnMaxSizesRef: RefObject<Readonly<Record<string, number>>>;
  readonly columnPinning: ColumnPinningState;
  readonly defaultColumnVisibility: VisibilityState;
  readonly lockedColumnIds: readonly string[];
  readonly persistenceKey: string;
  readonly skipPersistRef: { current: boolean };
  readonly snapshot: DataGridPreferencesSnapshot;
  readonly snapshotRef: RefObject<DataGridPreferencesSnapshot>;
}

/** Debounced localStorage persistence and flush on page hide. */
export function useDataGridPersistEffects({
  canonicalOrder,
  columnMaxSizesRef,
  columnPinning,
  defaultColumnVisibility,
  lockedColumnIds,
  persistenceKey,
  skipPersistRef,
  snapshot,
  snapshotRef
}: UseDataGridPersistEffectsOptions): RefObject<ReturnType<typeof globalThis.setTimeout> | undefined> {
  const persistTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(INITIAL_PERSIST_TIMER);

  useEffect(
    function persistDataGridPreferencesDebounced() {
      if (skipPersistRef.current) {
        skipPersistRef.current = false;
        return;
      }

      if (persistTimerRef.current !== undefined) {
        globalThis.clearTimeout(persistTimerRef.current);
      }

      persistTimerRef.current = globalThis.setTimeout(() => {
        persistTimerRef.current = INITIAL_PERSIST_TIMER;
        persistDataGridPreferences({
          canonicalOrder,
          columnMaxSizes: columnMaxSizesRef.current,
          columnPinning,
          defaultColumnVisibility,
          lockedColumnIds,
          persistenceKey,
          snapshot
        });
      }, PERSIST_DEBOUNCE_MS);

      return () => {
        if (persistTimerRef.current !== undefined) {
          globalThis.clearTimeout(persistTimerRef.current);
          persistTimerRef.current = INITIAL_PERSIST_TIMER;
        }
      };
    },
    [canonicalOrder, columnMaxSizesRef, columnPinning, defaultColumnVisibility, lockedColumnIds, persistenceKey, skipPersistRef, snapshot]
  );

  useEffect(
    function flushDataGridPreferencesBeforeUnload() {
      function flush() {
        persistDataGridPreferences({
          canonicalOrder,
          columnMaxSizes: columnMaxSizesRef.current,
          columnPinning,
          defaultColumnVisibility,
          lockedColumnIds,
          persistenceKey,
          snapshot: snapshotRef.current
        });
      }

      globalThis.addEventListener("beforeunload", flush);
      globalThis.addEventListener("pagehide", flush);

      return () => {
        globalThis.removeEventListener("beforeunload", flush);
        globalThis.removeEventListener("pagehide", flush);
      };
    },
    [canonicalOrder, columnMaxSizesRef, columnPinning, defaultColumnVisibility, lockedColumnIds, persistenceKey, snapshotRef]
  );

  return persistTimerRef;
}
