import { applyDataGridColumnSizingCssVars } from "~/src/components/custom/datagrid/lib/data-grid-column-width";
import {
  defaultPreferencesSnapshot,
  readDataGridPreferences,
  sanitizeColumnSizing,
  STORAGE_PREFIX,
  type DataGridPreferencesSnapshot
} from "~/src/components/custom/datagrid/lib/data-grid-preferences";

type Listener = () => void;

export interface DataGridPreferencesStore {
  readonly getSnapshot: () => DataGridPreferencesSnapshot;
  readonly setSnapshot: (next: DataGridPreferencesSnapshot) => void;
  readonly subscribe: (listener: Listener) => () => void;
}

export interface DataGridPreferencesStoreConfig {
  readonly canonicalOrder: readonly string[];
  readonly columnMinSizes: Readonly<Record<string, number>>;
  readonly lockedColumnIds: readonly string[];
  readonly persistenceKey: string;
}

export function createDataGridPreferencesStore(config: DataGridPreferencesStoreConfig): DataGridPreferencesStore {
  const { canonicalOrder, persistenceKey } = config;

  let snapshot = defaultPreferencesSnapshot(canonicalOrder);

  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => snapshot,
    setSnapshot: (next: DataGridPreferencesSnapshot) => {
      snapshot = next;
      if (typeof document !== "undefined") {
        applyDataGridColumnSizingCssVars(persistenceKey, snapshot.columnSizing);
      }
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

/** Re-applies every saved datagrid width from localStorage (client-only safety net). */
export function bootstrapAllDataGridColumnSizingFromStorage(): void {
  if (typeof document === "undefined" || globalThis.localStorage === undefined) {
    return;
  }

  const INDEX_STEP = 1;

  for (let index = 0; index < localStorage.length; index += INDEX_STEP) {
    const storageKey = localStorage.key(index);
    if (storageKey !== null && storageKey.startsWith(STORAGE_PREFIX)) {
      const persistenceKey = storageKey.slice(STORAGE_PREFIX.length);
      const stored = readDataGridPreferences(persistenceKey);
      if (stored?.columnSizing !== undefined) {
        const columnIds = stored.columnOrder ?? Object.keys(stored.columnSizing);
        applyDataGridColumnSizingCssVars(persistenceKey, sanitizeColumnSizing({ columnIds, saved: stored.columnSizing }));
      }
    }
  }
}
