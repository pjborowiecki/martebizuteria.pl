import { createContext, type JSX, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import type { Collection } from "~/src/modules/collection/collection.types";

export type CollectionsSheetMode = "closed" | "create" | "edit";

export interface CollectionsSheetState {
  readonly collection: Collection["adminListItem"] | undefined;
  readonly mode: CollectionsSheetMode;
}

export interface CollectionsSheetApi {
  readonly close: () => void;
  readonly collection: Collection["adminListItem"] | undefined;
  readonly mode: CollectionsSheetMode;
  readonly open: boolean;
  readonly openCreate: () => void;
  readonly openEdit: (collection: Collection["adminListItem"]) => void;
  readonly setOpen: (open: boolean) => void;
}

const CLOSED_STATE: CollectionsSheetState = { collection: undefined, mode: "closed" };

const CollectionsSheetContext = createContext<CollectionsSheetApi | undefined>(undefined);

/** Controls the shared create/edit collection sheet for the list page. */
export function useCollectionsSheetState(): CollectionsSheetApi {
  const [state, setState] = useState<CollectionsSheetState>(CLOSED_STATE);

  const openCreate = useCallback(() => {
    setState({ collection: undefined, mode: "create" });
  }, []);

  const openEdit = useCallback((collection: Collection["adminListItem"]) => {
    setState({ collection, mode: "edit" });
  }, []);

  const close = useCallback(() => {
    setState(CLOSED_STATE);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    if (!open) {
      setState(CLOSED_STATE);
    }
  }, []);

  return useMemo(
    () => ({
      close,
      collection: state.collection,
      mode: state.mode,
      open: state.mode !== "closed",
      openCreate,
      openEdit,
      setOpen
    }),
    [close, openCreate, openEdit, setOpen, state.collection, state.mode]
  );
}

export function CollectionsSheetProvider({ children, value }: Readonly<{ children: ReactNode; value: CollectionsSheetApi }>): JSX.Element {
  const { Provider } = CollectionsSheetContext;
  return <Provider value={value}>{children}</Provider>;
}

export function useCollectionsSheet(): CollectionsSheetApi {
  const context = useContext(CollectionsSheetContext);
  if (context === undefined) {
    throw new Error("useCollectionsSheet must be used within CollectionsSheetProvider");
  }
  return context;
}
