import { useCallback, useEffect, useRef, useState } from "react";

import type { UseMutationResult } from "@tanstack/react-query";

import type { RowMoveDirection } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { moveItemBefore, sameOrder, swapItems } from "~/src/components/custom/datagrid/lib/data-grid.utils";

import type { Collection } from "~/src/modules/collection/collection.types";

const ONE_STEP = 1;

export interface CollectionOrdering {
  readonly draggingId: string | undefined;
  readonly handleDragEnter: (overId: string) => void;
  readonly handleDragStart: (id: string) => void;
  readonly handleDrop: () => void;
  readonly handleMove: (id: string, direction: RowMoveDirection) => void;
  readonly items: Collection["adminListItem"][];
}

/**
 * Holds the optimistic display order and the drag/keyboard handlers that mutate
 * it, persisting through `reorder` and revalidating once the request settles.
 */
export function useCollectionOrdering(
  data: Collection["adminListItem"][],
  reorder: UseMutationResult<{ ok: boolean }, Error, readonly string[]>
): CollectionOrdering {
  const [items, setItems] = useState<Collection["adminListItem"][]>(data);
  const [draggingId, setDraggingId] = useState<string | undefined>();

  // Refs give the drag/keyboard handlers the latest values without re-binding them.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const draggingIdRef = useRef(draggingId);
  draggingIdRef.current = draggingId;

  const isReordering = reorder.isPending;

  // Resync with the server unless a drag or a persist is in flight (which would
  // briefly revert the optimistic order before the refetch lands).
  useEffect(() => {
    if (draggingId === undefined && !isReordering) {
      setItems(data);
    }
  }, [data, draggingId, isReordering]);

  const persistOrder = useCallback(
    (ordered: Collection["adminListItem"][]) => {
      const orderedIds = ordered.map((item) => item.id);
      const serverIds = data.map((item) => item.id);
      if (!sameOrder(orderedIds, serverIds)) {
        reorder.mutate(orderedIds);
      }
    },
    [data, reorder]
  );

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragEnter = useCallback((overId: string) => {
    const dragId = draggingIdRef.current;
    if (dragId === undefined || dragId === overId) {
      return;
    }
    setItems((list) => moveItemBefore(list, dragId, overId));
  }, []);

  const handleDrop = useCallback(() => {
    setDraggingId(undefined);
    persistOrder(itemsRef.current);
  }, [persistOrder]);

  const handleMove = useCallback(
    (id: string, direction: RowMoveDirection) => {
      const list = itemsRef.current;
      const index = list.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - ONE_STEP : index + ONE_STEP;
      const next = swapItems(list, index, target);
      if (
        sameOrder(
          next.map((item) => item.id),
          list.map((item) => item.id)
        )
      ) {
        return;
      }
      setItems(next);
      persistOrder(next);
    },
    [persistOrder]
  );

  return { draggingId, handleDragEnter, handleDragStart, handleDrop, handleMove, items };
}
