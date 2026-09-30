import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { useIsMobile } from "~/src/hooks/use-mobile"

interface MediaQueryStub {
  readonly listeners: Set<() => void>
  readonly queries: string[]
  matches: boolean
  removed: number
}

const stubMatchMedia = (initialMatches: boolean): MediaQueryStub => {
  const stub: MediaQueryStub = { listeners: new Set(), matches: initialMatches, queries: [], removed: 0 }
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
        stub.removed += 1
      },
    }
  })

  return stub
}

const emitChange = (stub: MediaQueryStub, matches: boolean): void => {
  act(() => {
    stub.matches = matches
    for (const listener of stub.listeners) {
      listener()
    }
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("useIsMobile", () => {
  it("reports a mobile viewport when the query already matches", () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it("reports a desktop viewport when the query does not match", () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it("watches the 767 pixel breakpoint", () => {
    const stub = stubMatchMedia(false)
    renderHook(() => useIsMobile())

    expect(stub.queries).toStrictEqual(["(max-width: 767px)"])
  })

  it("follows the viewport across the breakpoint in both directions", () => {
    const stub = stubMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())

    emitChange(stub, true)

    expect(result.current).toBe(true)

    emitChange(stub, false)

    expect(result.current).toBe(false)
  })

  it("stops listening once the component unmounts", () => {
    const stub = stubMatchMedia(true)
    const { unmount } = renderHook(() => useIsMobile())

    unmount()

    expect(stub.removed).toBe(1)
    expect(stub.listeners.size).toBe(0)
  })
})
