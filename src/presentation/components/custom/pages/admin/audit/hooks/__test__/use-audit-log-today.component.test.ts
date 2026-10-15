import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { useAuditLogToday } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-audit-log-today"

const MS_PER_MINUTE = 60_000

const MS_PER_DAY = 86_400_000

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("useAuditLogToday", () => {
  it("names the day it is in Poland, though it is still the day before in UTC", () => {
    vi.useFakeTimers({ now: new Date("2026-10-14T22:30:00.000Z") })

    const { result } = renderHook(() => useAuditLogToday())

    expect(result.current).toBe("2026-10-15")
  })

  it("moves to the next day at midnight in Poland while nothing else draws the page again", () => {
    vi.useFakeTimers({ now: new Date("2026-10-14T21:59:00.000Z") })
    const { result } = renderHook(() => useAuditLogToday())

    advance(MS_PER_MINUTE - 1)

    expect(result.current).toBe("2026-10-14")

    advance(1)

    expect(result.current).toBe("2026-10-15")
  })

  it("keeps moving on at every following midnight, including the 25-hour day the clocks go back", () => {
    vi.useFakeTimers({ now: new Date("2026-10-23T22:00:00.000Z") })
    const { result } = renderHook(() => useAuditLogToday())

    advance(MS_PER_DAY)

    expect(result.current).toBe("2026-10-25")

    advance(MS_PER_DAY)

    expect(result.current).toBe("2026-10-25")

    advance(MS_PER_DAY / 24)

    expect(result.current).toBe("2026-10-26")
  })

  it("stops waiting for midnight once nothing shows the day", () => {
    vi.useFakeTimers({ now: new Date("2026-10-14T21:59:00.000Z") })
    const { unmount } = renderHook(() => useAuditLogToday())

    expect(vi.getTimerCount()).toBe(1)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
