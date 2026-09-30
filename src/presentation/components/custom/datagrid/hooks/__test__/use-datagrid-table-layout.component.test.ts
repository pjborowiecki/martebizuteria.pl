import { type RefObject, createRef } from "react"

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { useDatagridContainerWidth } from "~/src/presentation/components/custom/datagrid/hooks/use-datagrid-table-layout"

const observers: TestResizeObserver[] = []
const disconnectSpy = vi.fn()

class TestResizeObserver {
  callback: () => void

  constructor(callback: () => void) {
    this.callback = callback
    observers.push(this)
  }

  observe(): void {}

  disconnect(): void {
    disconnectSpy()
  }
}

const setClientWidth = (element: HTMLElement, value: number): void => {
  Object.defineProperty(element, "clientWidth", { configurable: true, value })
}

const buildContainer = (width: number): RefObject<HTMLElement | null> => {
  const element = document.createElement("div")
  setClientWidth(element, width)
  document.body.replaceChildren(element)
  const ref = createRef<HTMLElement | null>()
  ref.current = element

  return ref
}

describe("useDatagridContainerWidth", () => {
  beforeEach(() => {
    observers.length = 0
    disconnectSpy.mockClear()
    vi.stubGlobal("ResizeObserver", TestResizeObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    document.body.innerHTML = ""
  })

  it("stays at zero without a container", () => {
    const ref = createRef<HTMLElement | null>()
    const { result } = renderHook(() => useDatagridContainerWidth(ref, 0))

    expect(result.current).toBe(0)
    expect(observers).toHaveLength(0)
  })

  it("reports the container width on mount", () => {
    const ref = buildContainer(640)
    const { result } = renderHook(() => useDatagridContainerWidth(ref, 0))

    expect(result.current).toBe(640)
  })

  it("reports a new width when the container is resized", () => {
    const ref = buildContainer(640)
    const { result } = renderHook(() => useDatagridContainerWidth(ref, 0))

    const element = ref.current
    if (element !== null) {
      setClientWidth(element, 900)
    }
    act(() => {
      for (const observer of observers) {
        observer.callback()
      }
    })

    expect(result.current).toBe(900)
  })

  it("keeps the reported width when a resize reports the same value", () => {
    const ref = buildContainer(640)
    const { result } = renderHook(() => useDatagridContainerWidth(ref, 0))

    act(() => {
      for (const observer of observers) {
        observer.callback()
      }
    })

    expect(result.current).toBe(640)
  })

  it("re-observes when the layout key changes", () => {
    const ref = buildContainer(640)
    const { rerender } = renderHook((layoutKey: number) => useDatagridContainerWidth(ref, layoutKey), { initialProps: 0 })

    rerender(1)

    expect(observers).toHaveLength(2)
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it("disconnects the observer on unmount", () => {
    const ref = buildContainer(640)
    const { unmount } = renderHook(() => useDatagridContainerWidth(ref, 0))

    unmount()

    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })
})
