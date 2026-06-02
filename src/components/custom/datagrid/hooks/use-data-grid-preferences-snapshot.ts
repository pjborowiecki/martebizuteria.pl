import { useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";

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
  readonly columnMinSizes: Readonly<Record<string, number>>;
  readonly lockedColumnIds: readonly string[];
  readonly persistenceKey: string;
}

export interface DataGridPreferencesSnapshotApi {
  readonly getStore: () => DataGridPreferencesStore;
  readonly snapshot: DataGridPreferencesSnapshot;
}

/** Subscribes to persisted layout prefs; hydrates from localStorage after the first paint. */
export function useDataGridPreferencesSnapshot({
  canonicalOrder,
  columnMinSizes,
  lockedColumnIds,
  persistenceKey
}: UseDataGridPreferencesSnapshotOptions): DataGridPreferencesSnapshotApi {
  const columnMinSizesRef = useRef(columnMinSizes);
  columnMinSizesRef.current = columnMinSizes;

  const storeRef = useRef<DataGridPreferencesStore | null>(null);

  const getStore = useCallback((): DataGridPreferencesStore => {
    storeRef.current ??= createDataGridPreferencesStore({
      canonicalOrder,
      columnMinSizes: columnMinSizesRef.current,
      lockedColumnIds,
      persistenceKey
    });
    return storeRef.current;
  }, [canonicalOrder, lockedColumnIds, persistenceKey]);

  const serverSnapshot = useMemo(() => defaultPreferencesSnapshot(canonicalOrder), [canonicalOrder]);
  const preferencesHydratedRef = useRef(false);

  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);

  const getClientSnapshot = useCallback(() => {
    if (!preferencesHydratedRef.current) {
      return serverSnapshot;
    }

    return getStore().getSnapshot();
  }, [getStore, serverSnapshot]);

  useLayoutEffect(
    function hydrateDataGridPreferencesFromStorage() {
      if (typeof document === "undefined") {
        return;
      }

      preferencesHydratedRef.current = true;
      getStore().setSnapshot(
        loadDataGridPreferences({
          canonicalOrder,
          columnMinSizes: columnMinSizesRef.current,
          lockedColumnIds,
          persistenceKey
        })
      );
    },
    [canonicalOrder, getStore, lockedColumnIds, persistenceKey]
  );

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
