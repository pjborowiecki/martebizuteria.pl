import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { useColumnReorder } from "~/src/presentation/components/custom/datagrid/hooks/use-column-reorder"

type SetColumnOrder = (updater: string[] | ((current: string[]) => string[])) => void

const ORDER = ["select", "name", "status", "createdAt"]

describe("useColumnReorder", () => {
  afterEach(() => {
    cleanup()
  })

  it("starts with no dragged column and a copy of the order", () => {
    const setColumnOrder = vi.fn<SetColumnOrder>()
    const { result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder }))

    expect(result.current.api.draggedColumnId).toBeUndefined()
    expect(result.current.columnOrder).toStrictEqual(ORDER)
    expect(result.current.columnOrder).not.toBe(ORDER)
  })

  it("records the dragged column on drag start", () => {
    const { result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder: vi.fn(() => {}) }))

    act(() => {
      result.current.api.onColumnDragStart("status")
    })

    expect(result.current.api.draggedColumnId).toBe("status")
  })

  it("ignores a drag over before any drag start", () => {
    const setColumnOrder = vi.fn<SetColumnOrder>()
    const { result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder }))

    act(() => {
      result.current.api.onColumnDragOver("name")
    })

    expect(setColumnOrder).not.toHaveBeenCalled()
  })

  it("ignores a drag over the dragged column itself", () => {
    const setColumnOrder = vi.fn<SetColumnOrder>()
    const { result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder }))

    act(() => {
      result.current.api.onColumnDragStart("status")
    })
    act(() => {
      result.current.api.onColumnDragOver("status")
    })

    expect(setColumnOrder).not.toHaveBeenCalled()
  })

  it("moves the dragged column to the position it is dragged over", () => {
    const setColumnOrder = vi.fn<SetColumnOrder>()
    const { result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder }))

    act(() => {
      result.current.api.onColumnDragStart("createdAt")
    })
    act(() => {
      result.current.api.onColumnDragOver("name")
    })

    const [updater] = setColumnOrder.mock.calls[0] ?? []

    expect(typeof updater).toBe("function")
    expect(typeof updater === "function" ? updater(ORDER) : undefined).toStrictEqual(["select", "createdAt", "name", "status"])
  })

  it("leaves the order untouched when the drop target is unknown", () => {
    const setColumnOrder = vi.fn<SetColumnOrder>()
    const { result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder }))

    act(() => {
      result.current.api.onColumnDragStart("status")
    })
    act(() => {
      result.current.api.onColumnDragOver("missing")
    })

    const [updater] = setColumnOrder.mock.calls[0] ?? []

    expect(typeof updater === "function" ? updater(ORDER) : undefined).toStrictEqual(ORDER)
  })

  it("clears the dragged column on drag end", () => {
    const { result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder: vi.fn(() => {}) }))

    act(() => {
      result.current.api.onColumnDragStart("status")
    })
    act(() => {
      result.current.api.onColumnDragEnd()
    })

    expect(result.current.api.draggedColumnId).toBeUndefined()
  })

  it("keeps the drag callbacks stable across renders", () => {
    const setColumnOrder = vi.fn<SetColumnOrder>()
    const { rerender, result } = renderHook(() => useColumnReorder({ columnOrder: ORDER, setColumnOrder }))
    const first = result.current.api

    rerender()

    expect(result.current.api.onColumnDragStart).toBe(first.onColumnDragStart)
    expect(result.current.api.onColumnDragEnd).toBe(first.onColumnDragEnd)
    expect(result.current.api.onColumnDragOver).toBe(first.onColumnDragOver)
  })
})
