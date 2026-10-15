import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  coerceNumber,
  formatCalendarDateToIsoDate,
  formatRelativeFromNow,
  formatTimestamp,
  instantOfWallClock,
  normalizeCalendarDate,
  startOfCalendarDate,
  toCalendarDate,
} from "~/src/modules/_core/utils/datetime"

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

describe("normalizeCalendarDate", () => {
  it("rolls days before the first of the month back into the previous year", () => {
    expect(normalizeCalendarDate({ day: -2, month: 1, year: 2027 })).toStrictEqual({ day: 29, month: 12, year: 2026 })
  })

  it("rolls months past December forward into the next year", () => {
    expect(normalizeCalendarDate({ day: 1, month: 14, year: 2026 })).toStrictEqual({ day: 1, month: 2, year: 2027 })
  })

  it("lands on the leap day of a leap year", () => {
    expect(normalizeCalendarDate({ day: 29, month: 2, year: 2028 })).toStrictEqual({ day: 29, month: 2, year: 2028 })
    expect(normalizeCalendarDate({ day: 29, month: 2, year: 2027 })).toStrictEqual({ day: 1, month: 3, year: 2027 })
  })

  it("leaves a real date as it is", () => {
    expect(normalizeCalendarDate({ day: 15, month: 6, year: 2026 })).toStrictEqual({ day: 15, month: 6, year: 2026 })
  })
})

describe("startOfCalendarDate", () => {
  it.each([
    ["New Year's Day", { day: 1, month: 1, year: 2027 }, "2026-12-31T23:00:00.000Z"],
    ["the Saturday before clocks go forward", { day: 28, month: 3, year: 2026 }, "2026-03-27T23:00:00.000Z"],
    ["the Sunday clocks go forward", { day: 29, month: 3, year: 2026 }, "2026-03-28T23:00:00.000Z"],
    ["the Monday after clocks go forward", { day: 30, month: 3, year: 2026 }, "2026-03-29T22:00:00.000Z"],
    ["the Sunday clocks go back", { day: 25, month: 10, year: 2026 }, "2026-10-24T22:00:00.000Z"],
    ["the Monday after clocks go back", { day: 26, month: 10, year: 2026 }, "2026-10-25T23:00:00.000Z"],
  ])("starts %s at midnight in Warsaw", (_label, date, expected) => {
    expect(startOfCalendarDate(date, "Europe/Warsaw").toISOString()).toBe(expected)
  })

  it("starts a day west of Greenwich after midnight UTC", () => {
    expect(startOfCalendarDate({ day: 1, month: 7, year: 2026 }, "America/New_York").toISOString()).toBe("2026-07-01T04:00:00.000Z")
  })

  it("starts a day in a half-hour zone on the half hour", () => {
    expect(startOfCalendarDate({ day: 1, month: 7, year: 2026 }, "Asia/Kolkata").toISOString()).toBe("2026-06-30T18:30:00.000Z")
  })

  it("starts the same day toCalendarDate reads back in that zone", () => {
    const start = startOfCalendarDate({ day: 25, month: 10, year: 2026 }, "Europe/Warsaw")
    const lastMomentBefore = new Date(start.getTime() - 1)

    expect(toCalendarDate(start, "Europe/Warsaw")).toStrictEqual({ day: 25, month: 10, year: 2026 })
    expect(toCalendarDate(lastMomentBefore, "Europe/Warsaw")).toStrictEqual({ day: 24, month: 10, year: 2026 })
  })
})

describe("instantOfWallClock", () => {
  it.each([
    ["a summer afternoon", { day: 15, hour: 14, minute: 30, month: 6, year: 2026 }, "2026-06-15T12:30:00.000Z"],
    ["a winter afternoon", { day: 15, hour: 14, minute: 30, month: 1, year: 2026 }, "2026-01-15T13:30:00.000Z"],
    [
      "ten past midnight, still the previous day in UTC",
      { day: 15, hour: 0, minute: 10, month: 10, year: 2026 },
      "2026-10-14T22:10:00.000Z",
    ],
    ["the morning after clocks go forward", { day: 29, hour: 3, minute: 30, month: 3, year: 2026 }, "2026-03-29T01:30:00.000Z"],
    ["the morning after clocks go back", { day: 25, hour: 3, minute: 30, month: 10, year: 2026 }, "2026-10-25T02:30:00.000Z"],
  ])("reads %s on the Warsaw clock", (_label, wallClock, expected) => {
    expect(instantOfWallClock(wallClock, "Europe/Warsaw").toISOString()).toBe(expected)
  })

  it("reads the same wall clock as a later instant west of Greenwich", () => {
    expect(instantOfWallClock({ day: 1, hour: 9, minute: 0, month: 7, year: 2026 }, "America/New_York").toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    )
  })

  it("starts a day where startOfCalendarDate does", () => {
    expect(instantOfWallClock({ day: 25, hour: 0, minute: 0, month: 10, year: 2026 }, "Europe/Warsaw")).toStrictEqual(
      startOfCalendarDate({ day: 25, month: 10, year: 2026 }, "Europe/Warsaw"),
    )
  })
})

describe("formatCalendarDateToIsoDate", () => {
  it("pads the month and the day to two digits", () => {
    expect(formatCalendarDateToIsoDate({ day: 3, month: 1, year: 2026 })).toBe("2026-01-03")
  })

  it("writes the Warsaw date that has already begun while UTC is still on the day before", () => {
    expect(formatCalendarDateToIsoDate(toCalendarDate("2026-10-14T22:30:00.000Z", "Europe/Warsaw"))).toBe("2026-10-15")
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

describe("formatTimestamp", () => {
  const SECOND_PRECISION = new Date(2024, 5, 15, 9, 5, 7)

  it("prints the date and the time to the second in the Polish storefront locale by default", () => {
    expect(formatTimestamp(SECOND_PRECISION)).toBe("15 cze 2024, 09:05:07")
  })

  it("prints in the locale it is given", () => {
    expect(formatTimestamp(SECOND_PRECISION, "en-GB")).toBe("15 Jun 2024, 09:05:07")
  })

  it("accepts an ISO string as well as a date", () => {
    expect(formatTimestamp(SECOND_PRECISION.toISOString(), "en-GB")).toBe(formatTimestamp(SECOND_PRECISION, "en-GB"))
  })
})

describe("coerceNumber", () => {
  it.each([
    [null, 0],
    [undefined, 0],
  ])("reads %j as zero", (value, expected) => {
    expect(coerceNumber(value)).toBe(expected)
  })

  it.each([
    ["12.5", 12.5],
    [7, 7],
  ])("converts %j to the number %j", (value, expected) => {
    expect(coerceNumber(value)).toBe(expected)
  })

  it("converts a bigint aggregate from the driver to a plain number", () => {
    expect(coerceNumber(42n)).toBe(42)
  })
})
