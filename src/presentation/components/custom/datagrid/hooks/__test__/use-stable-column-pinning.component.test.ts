import { type ColumnPinningState } from "@tanstack/react-table"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { useStableColumnPinning } from "~/src/presentation/components/custom/datagrid/hooks/use-stable-column-pinning"

describe("useStableColumnPinning", () => {
  afterEach(() => {
    cleanup()
  })

  it("falls back to empty pinning sides when nothing is given", () => {
    const { result } = renderHook(() => useStableColumnPinning(undefined))

    expect(result.current).toStrictEqual({ end: [], start: [] })
  })

  it("copies the given pinning instead of holding the caller's arrays", () => {
    const start = ["select"]
    const end = ["actions"]
    const { result } = renderHook(() => useStableColumnPinning({ end, start }))

    expect(result.current).toStrictEqual({ end: ["actions"], start: ["select"] })
    expect(result.current.start).not.toBe(start)
    expect(result.current.end).not.toBe(end)
  })

  it("keeps the first pinning even when the prop changes", () => {
    const initialProps: ColumnPinningState = { end: [], start: ["select"] }
    const { rerender, result } = renderHook((pinning: ColumnPinningState) => useStableColumnPinning(pinning), { initialProps })
    const first = result.current

    rerender({ end: ["actions"], start: ["name"] })

    expect(result.current).toBe(first)
    expect(result.current).toStrictEqual({ end: [], start: ["select"] })
  })

  it("is not affected by later mutations of the array it was given", () => {
    const start: string[] = ["select"]
    const { result } = renderHook(() => useStableColumnPinning({ end: [], start }))

    start.push("name")

    expect(result.current.start).toStrictEqual(["select"])
  })
})
