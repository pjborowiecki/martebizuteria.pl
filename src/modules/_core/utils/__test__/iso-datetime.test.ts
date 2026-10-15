import { describe, expect, it } from "vite-plus/test"

import { parseIsoDateToStartMs } from "~/src/modules/_core/utils/iso-date"
import {
  combineIsoDateAndTime,
  defaultDateTimeFilterEndTime,
  hasIsoDateTimeTimeComponent,
  isIsoDateTimeLocalString,
  isTimeInputValue,
  parseIsoDateTimeLocal,
  parseIsoDateTimeLocalToMs,
  splitIsoDateTimeLocal,
} from "~/src/modules/_core/utils/iso-datetime"

describe("isTimeInputValue", () => {
  it.each([["00:00"], ["23:59"], ["09:05"]])("accepts the zero padded time %s", (value) => {
    expect(isTimeInputValue(value)).toBe(true)
  })

  it.each([["9:05"], ["09:05:00"], ["0905"], [""], ["24:00"], ["23:60"], ["99:99"]])("rejects %s", (value) => {
    expect(isTimeInputValue(value)).toBe(false)
  })
})

describe("hasIsoDateTimeTimeComponent", () => {
  it("distinguishes a date-only value from a datetime", () => {
    expect(hasIsoDateTimeTimeComponent("2024-03-05")).toBe(false)
    expect(hasIsoDateTimeTimeComponent("2024-03-05T10:30")).toBe(true)
  })
})

describe("isIsoDateTimeLocalString", () => {
  it.each([["2024-03-05"], ["2024-03-05T10:30"], ["2024-03-05T10:30:45"]])("accepts %s", (value) => {
    expect(isIsoDateTimeLocalString(value)).toBe(true)
  })

  it.each([["2024-03-05T10"], ["2024-3-05T10:30"], ["2024-03-05 10:30"], [""]])("rejects the malformed value %s", (value) => {
    expect(isIsoDateTimeLocalString(value)).toBe(false)
  })

  it.each([
    "2024-02-30T10:30",
    "2023-02-29T10:30",
    "2024-13-05T10:30",
    "2024-00-05T10:30",
    "2024-03-00T10:30",
    "2024-03-05T24:00",
    "2024-03-05T23:60",
    "2024-03-05T23:59:60",
  ])("rejects %s instead of silently rolling into another date or time", (value) => {
    expect(isIsoDateTimeLocalString(value)).toBe(false)
  })

  it("accepts the last second of a leap day", () => {
    expect(isIsoDateTimeLocalString("2024-02-29T23:59:59")).toBe(true)
  })
})

describe("combineIsoDateAndTime", () => {
  it("returns nothing when there is no date to anchor the time to", () => {
    expect(combineIsoDateAndTime("", "10:30")).toBe("")
  })

  it("keeps the bare date when the time is missing or unusable", () => {
    expect(combineIsoDateAndTime("2024-03-05", "")).toBe("2024-03-05")
    expect(combineIsoDateAndTime("2024-03-05", "9:5")).toBe("2024-03-05")
  })

  it("joins a valid date and time", () => {
    expect(combineIsoDateAndTime("2024-03-05", "10:30")).toBe("2024-03-05T10:30")
  })
})

describe("splitIsoDateTimeLocal", () => {
  it("defaults a date-only value to the start of the day", () => {
    expect(splitIsoDateTimeLocal("2024-03-05")).toStrictEqual({ date: "2024-03-05", time: "00:00" })
  })

  it("drops seconds from the editable time field", () => {
    expect(splitIsoDateTimeLocal("2024-03-05T10:30:45")).toStrictEqual({ date: "2024-03-05", time: "10:30" })
  })

  it("fills in missing minutes", () => {
    expect(splitIsoDateTimeLocal("2024-03-05T10")).toStrictEqual({ date: "2024-03-05", time: "10:00" })
  })

  it("round trips through combineIsoDateAndTime", () => {
    const parts = splitIsoDateTimeLocal("2024-03-05T10:30")

    expect(combineIsoDateAndTime(parts.date, parts.time)).toBe("2024-03-05T10:30")
  })
})

describe("parseIsoDateTimeLocalToMs", () => {
  it("falls back to the start of the day for a date-only value", () => {
    expect(parseIsoDateTimeLocalToMs("2024-03-05")).toBe(parseIsoDateToStartMs("2024-03-05"))
  })

  it("reads hours, minutes and seconds in local time", () => {
    expect(parseIsoDateTimeLocalToMs("2024-03-05T10:30:45")).toBe(new Date(2024, 2, 5, 10, 30, 45).getTime())
  })

  it("defaults seconds to zero", () => {
    expect(parseIsoDateTimeLocalToMs("2024-03-05T10:30")).toBe(new Date(2024, 2, 5, 10, 30, 0).getTime())
  })

  it("reports NaN when there is no time component to parse", () => {
    expect(parseIsoDateTimeLocalToMs("nonsense")).toBeNaN()
  })
})

describe("parseIsoDateTimeLocal", () => {
  it("reads a date-only value as the wall clock at midnight", () => {
    expect(parseIsoDateTimeLocal("2026-10-15")).toStrictEqual({ day: 15, hour: 0, minute: 0, month: 10, year: 2026 })
  })

  it("reads the hour and minute of a date and time", () => {
    expect(parseIsoDateTimeLocal("2026-10-15T08:30")).toStrictEqual({ day: 15, hour: 8, minute: 30, month: 10, year: 2026 })
  })

  it("keeps the minute and drops the seconds", () => {
    expect(parseIsoDateTimeLocal("2026-10-15T23:59:45")).toStrictEqual({ day: 15, hour: 23, minute: 59, month: 10, year: 2026 })
  })
})

describe("defaultDateTimeFilterEndTime", () => {
  it("closes a filter range at the last usable minute of the day", () => {
    expect(defaultDateTimeFilterEndTime()).toBe("23:59")
    expect(isTimeInputValue(defaultDateTimeFilterEndTime())).toBe(true)
  })
})
