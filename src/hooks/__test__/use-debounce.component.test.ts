import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { useDebounce } from "~/src/hooks/use-debounce"

const DELAY_MS = 300

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("useDebounce", () => {
  it("returns the initial value before any delay has elapsed", () => {
    const { result } = renderHook(() => useDebounce("silver", DELAY_MS))

    expect(result.current).toBe("silver")
  })

  it("keeps the previous value until the delay elapses", () => {
    const { rerender, result } = renderHook(({ value }) => useDebounce(value, DELAY_MS), { initialProps: { value: "silver" } })

    rerender({ value: "gold" })
    advance(DELAY_MS - 1)

    expect(result.current).toBe("silver")
  })

  it("adopts the latest value once the delay elapses", () => {
    const { rerender, result } = renderHook(({ value }) => useDebounce(value, DELAY_MS), { initialProps: { value: "silver" } })

    rerender({ value: "gold" })
    advance(DELAY_MS)

    expect(result.current).toBe("gold")
  })

  it("restarts the wait on every change, so a steady typist never sees an intermediate value", () => {
    const { rerender, result } = renderHook(({ value }) => useDebounce(value, DELAY_MS), { initialProps: { value: "s" } })

    rerender({ value: "si" })
    advance(DELAY_MS - 100)
    rerender({ value: "sil" })
    advance(DELAY_MS - 100)

    expect(result.current).toBe("s")

    advance(100)

    expect(result.current).toBe("sil")
  })

  it("reschedules against the new delay when the delay itself changes", () => {
    const { rerender, result } = renderHook(({ delay, value }) => useDebounce(value, delay), {
      initialProps: { delay: DELAY_MS, value: "silver" },
    })

    rerender({ delay: DELAY_MS, value: "gold" })
    advance(DELAY_MS - 100)
    rerender({ delay: 1000, value: "gold" })
    advance(DELAY_MS)

    expect(result.current).toBe("silver")

    advance(1000)

    expect(result.current).toBe("gold")
  })

  it("debounces a zero delay to the next tick rather than applying it synchronously", () => {
    const { rerender, result } = renderHook(({ value }) => useDebounce(value, 0), { initialProps: { value: "silver" } })

    rerender({ value: "gold" })

    expect(result.current).toBe("silver")

    advance(0)

    expect(result.current).toBe("gold")
  })

  it("drops the pending timer on unmount", () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, DELAY_MS), { initialProps: { value: "silver" } })

    rerender({ value: "gold" })
    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })

  it("debounces values of any shape, not only strings", () => {
    const first = { qty: 1 }
    const second = { qty: 2 }
    const { rerender, result } = renderHook(({ value }) => useDebounce(value, DELAY_MS), { initialProps: { value: first } })

    rerender({ value: second })
    advance(DELAY_MS)

    expect(result.current).toBe(second)
  })
})
