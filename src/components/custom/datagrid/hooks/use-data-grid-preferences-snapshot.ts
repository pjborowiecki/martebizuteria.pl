import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import type { ColumnPinningState, VisibilityState } from "@tanstack/react-table";

import { useStableColumnPinning } from "~/src/components/custom/datagrid/hooks/use-stable-column-pinning";
import {
  defaultPreferencesSnapshot,
  loadDataGridPreferences,
  type DataGridPreferencesSnapshot
} from "~/src/components/custom/datagrid/lib/data-grid-preferences";
import {
  createDataGridPreferencesStore,
  type DataGridPreferencesStore
} from "~/src/components/custom/datagrid/lib/data-grid-preferences-store";

export interface UseDataGridPreferencesSnapshotOptions {
  readonly canonicalOrder: readonly string[];
  readonly columnMaxSizes: Readonly<Record<string, number>>;
  readonly columnMinSizes: Readonly<Record<string, number>>;
  readonly columnPinning?: ColumnPinningState;
  readonly defaultColumnVisibility?: VisibilityState;
  readonly lockedColumnIds: readonly string[];
  readonly persistenceKey: string;
}

export interface DataGridPreferencesSnapshotApi {
  readonly getStore: () => DataGridPreferencesStore;
  readonly snapshot: DataGridPreferencesSnapshot;
}

/** Subscribes to persisted layout prefs; hydrates from localStorage on first client read. */
export function useDataGridPreferencesSnapshot({
  canonicalOrder,
  columnMaxSizes,
  columnMinSizes,
  columnPinning = {},
  defaultColumnVisibility = {},
  lockedColumnIds,
  persistenceKey
}: UseDataGridPreferencesSnapshotOptions): DataGridPreferencesSnapshotApi {
  const columnMinSizesRef = useRef(columnMinSizes);
  columnMinSizesRef.current = columnMinSizes;
  const columnMaxSizesRef = useRef(columnMaxSizes);
  columnMaxSizesRef.current = columnMaxSizes;
  const stableColumnPinning = useStableColumnPinning(columnPinning);

  const storeRef = useRef<DataGridPreferencesStore | null>(null);
  const storePersistenceKeyRef = useRef<string | null>(null);

  const serverSnapshot = useMemo(
    () => defaultPreferencesSnapshot(canonicalOrder, defaultColumnVisibility, stableColumnPinning),
    [canonicalOrder, defaultColumnVisibility, stableColumnPinning]
  );

  const getStore = useCallback((): DataGridPreferencesStore => {
    if (storeRef.current === null || storePersistenceKeyRef.current !== persistenceKey) {
      storePersistenceKeyRef.current = persistenceKey;
      const initialSnapshot =
        typeof document === "undefined"
          ? serverSnapshot
          : loadDataGridPreferences({
              canonicalOrder,
              columnMaxSizes: columnMaxSizesRef.current,
              columnMinSizes: columnMinSizesRef.current,
              columnPinning: stableColumnPinning,
              defaultColumnVisibility,
              lockedColumnIds,
              persistenceKey
            });

      storeRef.current = createDataGridPreferencesStore({
        canonicalOrder,
        columnMaxSizes: columnMaxSizesRef.current,
        columnMinSizes: columnMinSizesRef.current,
        initialSnapshot,
        lockedColumnIds,
        persistenceKey
      });
    }

    return storeRef.current;
  }, [canonicalOrder, defaultColumnVisibility, lockedColumnIds, persistenceKey, serverSnapshot, stableColumnPinning]);

  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);

  const getClientSnapshot = useCallback(() => getStore().getSnapshot(), [getStore]);

  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof document === "undefined") {
        return () => {};
      }
      return getStore().subscribe(onStoreChange);
    },
    getClientSnapshot,
    getServerSnapshot
  );

  return { getStore, snapshot };
}
