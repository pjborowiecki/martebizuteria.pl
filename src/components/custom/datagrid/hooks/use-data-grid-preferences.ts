import { useCallback, useEffect, useMemo, useRef } from "react";

import type { ColumnSizingState, VisibilityState } from "@tanstack/react-table";

import { useDataGridPreferencesSnapshot } from "~/src/components/custom/datagrid/hooks/use-data-grid-preferences-snapshot";
import {
  clearDataGridPreferences,
  defaultPreferencesSnapshot,
  hasDataGridPreferenceOverrides,
  prepareDataGridPreferencesSnapshot,
  writeDataGridPreferences
} from "~/src/components/custom/datagrid/lib/data-grid-preferences";
import { clampDataGridColumnSizingToMins, omitNonResizableColumnSizing } from "~/src/components/custom/datagrid/lib/data-grid.utils";

const PERSIST_DEBOUNCE_MS = 300;

export interface UseDataGridPreferencesOptions {
  readonly columnMinSizes: Readonly<Record<string, number>>;
  readonly initialColumnOrder: readonly string[];
  readonly nonResizableColumnIds: readonly string[];
  readonly persistenceKey: string;
}

export interface DataGridPreferencesApi {
  readonly columnOrder: string[];
  readonly columnSizing: ColumnSizingState;
  readonly columnVisibility: VisibilityState;
  readonly hasPreferenceOverrides: boolean;
  readonly resetPreferences: () => void;
  readonly setColumnOrder: (updater: string[] | ((current: string[]) => string[])) => void;
  readonly setColumnSizing: (updater: ColumnSizingState | ((current: ColumnSizingState) => ColumnSizingState)) => void;
  readonly setColumnVisibility: (updater: VisibilityState | ((current: VisibilityState) => VisibilityState)) => void;
}

/**
 * Per-table layout preferences (order, widths, visibility) backed by localStorage.
 * Client `getSnapshot` reads storage synchronously (paired with the head bootstrap script).
 */
export function useDataGridPreferences({
  columnMinSizes,
  initialColumnOrder,
  nonResizableColumnIds,
  persistenceKey
}: UseDataGridPreferencesOptions): DataGridPreferencesApi {
  const canonicalOrder = useMemo(() => [...initialColumnOrder], [initialColumnOrder]);
  const lockedColumnIds = useMemo(() => [...nonResizableColumnIds], [nonResizableColumnIds]);
  const columnMinSizesRef = useRef(columnMinSizes);
  columnMinSizesRef.current = columnMinSizes;

  const { getStore, snapshot } = useDataGridPreferencesSnapshot({
    canonicalOrder,
    columnMinSizes,
    lockedColumnIds,
    persistenceKey
  });

  const skipPersistRef = useRef(true);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(
    function persistDataGridPreferences() {
      if (skipPersistRef.current) {
        skipPersistRef.current = false;
        return;
      }

      const timer = globalThis.setTimeout(() => {
        writeDataGridPreferences(persistenceKey, prepareDataGridPreferencesSnapshot(snapshot, lockedColumnIds));
      }, PERSIST_DEBOUNCE_MS);

      return () => {
        globalThis.clearTimeout(timer);
      };
    },
    [lockedColumnIds, persistenceKey, snapshot]
  );

  useEffect(
    function flushDataGridPreferencesBeforeUnload() {
      function flush() {
        writeDataGridPreferences(persistenceKey, prepareDataGridPreferencesSnapshot(snapshotRef.current, lockedColumnIds));
      }

      globalThis.addEventListener("beforeunload", flush);
      globalThis.addEventListener("pagehide", flush);

      return () => {
        globalThis.removeEventListener("beforeunload", flush);
        globalThis.removeEventListener("pagehide", flush);
      };
    },
    [lockedColumnIds, persistenceKey]
  );

  const setColumnOrder = useCallback(
    (updater: string[] | ((current: string[]) => string[])) => {
      const current = getStore().getSnapshot();
      const nextOrder = typeof updater === "function" ? updater([...current.columnOrder]) : updater;
      getStore().setSnapshot({ ...current, columnOrder: nextOrder });
    },
    [getStore]
  );

  const setColumnSizing = useCallback(
    (updater: ColumnSizingState | ((current: ColumnSizingState) => ColumnSizingState)) => {
      const current = getStore().getSnapshot();
      const cleaned = omitNonResizableColumnSizing(current.columnSizing, lockedColumnIds);
      const nextSizing = typeof updater === "function" ? updater(cleaned) : updater;
      getStore().setSnapshot({
        ...current,
        columnSizing: clampDataGridColumnSizingToMins(omitNonResizableColumnSizing(nextSizing, lockedColumnIds), columnMinSizesRef.current)
      });
    },
    [getStore, lockedColumnIds]
  );

  const setColumnVisibility = useCallback(
    (updater: VisibilityState | ((current: VisibilityState) => VisibilityState)) => {
      const current = getStore().getSnapshot();
      const nextVisibility = typeof updater === "function" ? updater(current.columnVisibility) : updater;
      getStore().setSnapshot({ ...current, columnVisibility: nextVisibility });
    },
    [getStore]
  );

  const resetPreferences = useCallback(() => {
    clearDataGridPreferences(persistenceKey, canonicalOrder);
    skipPersistRef.current = true;
    getStore().setSnapshot(defaultPreferencesSnapshot(canonicalOrder));
  }, [canonicalOrder, getStore, persistenceKey]);

  const hasPreferenceOverrides = useMemo(() => hasDataGridPreferenceOverrides(snapshot, canonicalOrder), [canonicalOrder, snapshot]);

  return {
    columnOrder: [...snapshot.columnOrder],
    columnSizing: snapshot.columnSizing,
    columnVisibility: snapshot.columnVisibility,
    hasPreferenceOverrides,
    resetPreferences,
    setColumnOrder,
    setColumnSizing,
    setColumnVisibility
  };
}
