import { useCallback, useMemo, useRef, useState } from "react";

import type { ColumnReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { reorderColumnOrder } from "~/src/components/custom/datagrid/lib/data-grid.utils";

export interface ColumnReorderState {
  readonly api: ColumnReorderApi;
  readonly columnOrder: string[];
  readonly setColumnOrder: (updater: string[] | ((current: string[]) => string[])) => void;
}

/**
 * Tracks left-to-right column order plus the header drag handlers that mutate it.
 * Dragging one header over another reorders both live; pinned utility columns
 * simply never start or accept a drag.
 */
export interface UseColumnReorderOptions {
  readonly columnOrder: readonly string[];
  readonly setColumnOrder: (updater: string[] | ((current: string[]) => string[])) => void;
}

export function useColumnReorder({ columnOrder, setColumnOrder }: UseColumnReorderOptions): ColumnReorderState {
  const [draggedColumnId, setDraggedColumnId] = useState<string | undefined>();

  const draggedRef = useRef(draggedColumnId);
  draggedRef.current = draggedColumnId;

  const onColumnDragStart = useCallback((id: string) => {
    setDraggedColumnId(id);
  }, []);

  const onColumnDragOver = useCallback(
    (overId: string) => {
      const draggedId = draggedRef.current;
      if (draggedId === undefined || draggedId === overId) {
        return;
      }
      setColumnOrder((current) => reorderColumnOrder(current, draggedId, overId));
    },
    [setColumnOrder]
  );

  const onColumnDragEnd = useCallback(() => {
    setDraggedColumnId(undefined);
  }, []);

  const api = useMemo<ColumnReorderApi>(
    () => ({ draggedColumnId, onColumnDragEnd, onColumnDragOver, onColumnDragStart }),
    [draggedColumnId, onColumnDragEnd, onColumnDragOver, onColumnDragStart]
  );

  return { api, columnOrder: [...columnOrder], setColumnOrder };
}
