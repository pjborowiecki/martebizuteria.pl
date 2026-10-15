import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { useDataGridPinning } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-pinning"

interface MediaQueryStub {
  readonly listeners: Set<() => void>
  readonly queries: string[]
  matches: boolean
}

const stubMatchMedia = (initialMatches: boolean): MediaQueryStub => {
  const stub: MediaQueryStub = { listeners: new Set(), matches: initialMatches, queries: [] }
  vi.stubGlobal("matchMedia", (query: string) => {
    stub.queries.push(query)

    return {
      addEventListener: (_event: string, listener: () => void) => {
        stub.listeners.add(listener)
      },
      get matches() {
        return stub.matches
      },
      media: query,
      removeEventListener: (_event: string, listener: () => void) => {
        stub.listeners.delete(listener)
      },
    }
  })

  return stub
}

const renderCrowdedGrid = () =>
  renderHook(() =>
    useDataGridPinning({ columnSizing: {}, layoutColumns: [], tableClientWidth: 200, tableLayout: undefined, tableWidth: 900 }),
  )

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("useDataGridPinning", () => {
  it("checks the screen against the desktop breakpoint", () => {
    const stub = stubMatchMedia(true)
    renderCrowdedGrid()

    expect(new Set(stub.queries)).toStrictEqual(new Set(["(min-width: 64rem)"]))
  })

  it("keeps the pinned columns of a crowded grid on a desktop screen", () => {
    stubMatchMedia(true)
    const { result } = renderCrowdedGrid()

    expect(result.current.pinsColumns).toBe(true)
  })

  it("lets every column of a crowded grid scroll on a phone or tablet", () => {
    stubMatchMedia(false)
    const { result } = renderCrowdedGrid()

    expect(result.current.pinsColumns).toBe(false)
  })

  it("follows the screen across the breakpoint and stops listening once unmounted", () => {
    const stub = stubMatchMedia(true)
    const { result, unmount } = renderCrowdedGrid()

    act(() => {
      stub.matches = false
      for (const listener of stub.listeners) {
        listener()
      }
    })

    expect(result.current.pinsColumns).toBe(false)

    unmount()

    expect(stub.listeners.size).toBe(0)
  })
})
