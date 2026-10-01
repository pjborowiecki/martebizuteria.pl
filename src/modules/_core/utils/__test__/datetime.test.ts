import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { formatRelativeFromNow, toCalendarDate } from "~/src/modules/_core/utils/datetime"

const NOW = new Date(2024, 5, 15, 12, 0, 0)

const MONTH_BOUNDARY = new Date("2026-10-01T00:30:00.000Z")

describe("toCalendarDate", () => {
  it("reads the calendar still running west of the date line", () => {
    expect(toCalendarDate(MONTH_BOUNDARY, "Pacific/Honolulu")).toStrictEqual({ day: 30, month: 9, year: 2026 })
  })

  it("reads the calendar already turned east of it", () => {
    expect(toCalendarDate(MONTH_BOUNDARY, "Asia/Tokyo")).toStrictEqual({ day: 1, month: 10, year: 2026 })
  })

  it("reads the store calendar for Warsaw", () => {
    expect(toCalendarDate("2026-09-30T23:30:00.000Z", "Europe/Warsaw")).toStrictEqual({ day: 1, month: 10, year: 2026 })
  })

  it("accepts an ISO string as well as a date", () => {
    expect(toCalendarDate(MONTH_BOUNDARY.toISOString(), "UTC")).toStrictEqual(toCalendarDate(MONTH_BOUNDARY, "UTC"))
  })
})

describe("formatRelativeFromNow", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [30_000, "now"],
    [5 * 60_000, "5 minutes ago"],
    [3 * 3_600_000, "3 hours ago"],
    [2 * 86_400_000, "2 days ago"],
  ])("describes %i ms ago as %s", (diffMs, expected) => {
    const at = new Date(NOW.getTime() - diffMs)

    expect(formatRelativeFromNow(at, "en-US")).toBe(expected)
  })

  it("switches to an absolute date beyond a week", () => {
    const at = new Date(NOW.getTime() - 8 * 86_400_000)

    expect(formatRelativeFromNow(at, "en-US")).toBe("Jun 7, 2024")
  })
})
