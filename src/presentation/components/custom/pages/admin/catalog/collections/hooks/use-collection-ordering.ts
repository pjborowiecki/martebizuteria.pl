import { useCallback, useEffect, useRef, useState } from "react"

import { type UseMutationResult } from "@tanstack/react-query"

import { type Collection } from "~/src/modules/product-collection/product-collection.types"

import { type RowMoveDirection } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { moveItemBefore, sameOrder, swapItems } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

export const useCollectionOrdering = (
  data: Collection["adminListItem"][],
  reorder: UseMutationResult<
    {
      ok: boolean
    },
    Error,
    readonly string[]
  >,
): CollectionOrdering => {
  const [items, setItems] = useState<Collection["adminListItem"][]>(data)
  const [draggingId, setDraggingId] = useState<string | undefined>()

  const itemsRef = useRef(items)
  itemsRef.current = items
  const draggingIdRef = useRef(draggingId)
  draggingIdRef.current = draggingId
  const isReordering = reorder.isPending

  // Keep optimistic order until dragging and persistence finish.
  useEffect(() => {
    if (draggingId === undefined && !isReordering) {
      setItems(data)
    }
  }, [data, draggingId, isReordering])
  const persistOrder = useCallback(
    (ordered: Collection["adminListItem"][]) => {
      const orderedIds = ordered.map((item) => item.id)
      const serverIds = data.map((item) => item.id)
      if (!sameOrder(orderedIds, serverIds)) {
        reorder.mutate(orderedIds)
      }
    },
    [data, reorder],
  )
  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id)
  }, [])
  const handleDragEnter = useCallback((overId: string) => {
    const dragId = draggingIdRef.current
    if (dragId === undefined || dragId === overId) {
      return
    }
    setItems((list) => moveItemBefore(list, dragId, overId))
  }, [])
  const handleDrop = useCallback(() => {
    setDraggingId(undefined)
    persistOrder(itemsRef.current)
  }, [persistOrder])
  const handleMove = useCallback(
    (id: string, direction: RowMoveDirection) => {
      const list = itemsRef.current
      const index = list.findIndex((item) => item.id === id)
      const target = direction === "up" ? index - 1 : index + 1
      const next = swapItems(list, index, target)
      if (
        sameOrder(
          next.map((item) => item.id),
          list.map((item) => item.id),
        )
      ) {
        return
      }
      setItems(next)
      persistOrder(next)
    },
    [persistOrder],
  )
  return {
    draggingId,
    handleDragEnter,
    handleDragStart,
    handleDrop,
    handleMove,
    items,
  }
}
export interface CollectionOrdering {
  readonly draggingId: string | undefined
  readonly handleDragEnter: (overId: string) => void
  readonly handleDragStart: (id: string) => void
  readonly handleDrop: () => void
  readonly handleMove: (id: string, direction: RowMoveDirection) => void
  readonly items: Collection["adminListItem"][]
}
