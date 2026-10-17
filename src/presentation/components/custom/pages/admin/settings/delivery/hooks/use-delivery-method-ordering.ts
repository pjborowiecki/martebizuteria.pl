import { useCallback, useEffect, useRef, useState } from "react"

import { type UseMutationResult } from "@tanstack/react-query"

import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

import { type RowMoveDirection } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { moveItemBefore, sameOrder, swapItems } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"

const offeredIds = (methods: readonly DeliveryMethod["adminMethod"][]): string[] =>
  methods.filter((method) => method.archivedAt === undefined).map((method) => method.id)

export const useDeliveryMethodOrdering = (
  data: DeliveryMethod["adminMethod"][],
  reorder: UseMutationResult<{ ok: boolean }, Error, string[]>,
): DeliveryMethodOrdering => {
  const [items, setItems] = useState<DeliveryMethod["adminMethod"][]>(data)
  const [draggingId, setDraggingId] = useState<string | undefined>()
  const itemsRef = useRef(items)
  itemsRef.current = items
  const draggingIdRef = useRef(draggingId)
  draggingIdRef.current = draggingId
  const isReordering = reorder.isPending

  useEffect(() => {
    if (draggingId === undefined && !isReordering) {
      setItems(data)
    }
  }, [data, draggingId, isReordering])

  const persistOrder = useCallback(
    (ordered: DeliveryMethod["adminMethod"][]) => {
      const orderedIds = offeredIds(ordered)
      if (!sameOrder(orderedIds, offeredIds(data))) {
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
    if (dragId === undefined || dragId === overId || !offeredIds(itemsRef.current).includes(overId)) {
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
      const next = swapItems(list, index, direction === "up" ? index - 1 : index + 1)
      if (sameOrder(offeredIds(next), offeredIds(list))) {
        return
      }
      setItems(next)
      persistOrder(next)
    },
    [persistOrder],
  )

  return { draggingId, handleDragEnter, handleDragStart, handleDrop, handleMove, items }
}

export interface DeliveryMethodOrdering {
  readonly draggingId: string | undefined
  readonly handleDragEnter: (overId: string) => void
  readonly handleDragStart: (id: string) => void
  readonly handleDrop: () => void
  readonly handleMove: (id: string, direction: RowMoveDirection) => void
  readonly items: DeliveryMethod["adminMethod"][]
}
