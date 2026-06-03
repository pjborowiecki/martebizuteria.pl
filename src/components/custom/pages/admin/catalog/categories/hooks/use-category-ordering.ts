import { useCallback, useEffect, useRef, useState } from "react";

import type { UseMutationResult } from "@tanstack/react-query";

import type { RowMoveDirection } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { moveItemBefore, sameOrder, swapItems } from "~/src/components/custom/datagrid/lib/data-grid.utils";

import type { Category } from "~/src/modules/category/category.types";

const ONE_STEP = 1;

export interface CategoryOrdering {
  readonly draggingId: string | undefined;
  readonly handleDragEnter: (overId: string) => void;
  readonly handleDragStart: (id: string) => void;
  readonly handleDrop: () => void;
  readonly handleMove: (id: string, direction: RowMoveDirection) => void;
  readonly items: Category["adminListItem"][];
}

/**
 * Holds the optimistic display order and the drag/keyboard handlers that mutate
 * it, persisting through `reorder` and revalidating once the request settles.
 */
export function useCategoryOrdering(
  data: Category["adminListItem"][],
  reorder: UseMutationResult<{ ok: boolean }, Error, readonly string[]>
): CategoryOrdering {
  const [items, setItems] = useState<Category["adminListItem"][]>(data);
  const [draggingId, setDraggingId] = useState<string | undefined>();

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const draggingIdRef = useRef(draggingId);
  draggingIdRef.current = draggingId;

  const isReordering = reorder.isPending;

  useEffect(() => {
    if (draggingId === undefined && !isReordering) {
      setItems(data);
    }
  }, [data, draggingId, isReordering]);

  const persistOrder = useCallback(
    (ordered: Category["adminListItem"][]) => {
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
