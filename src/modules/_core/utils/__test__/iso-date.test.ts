import { describe, expect, it } from "vite-plus/test"

import {
  formatDateToIsoDateLocal,
  isIsoDateString,
  parseIsoDateToEndMs,
  parseIsoDateToLocalDate,
  parseIsoDateToStartMs,
} from "~/src/modules/_core/utils/iso-date"

const MS_IN_DAY = 86_400_000

describe("isIsoDateString", () => {
  it.each([["2024-01-01"], ["2024-02-29"], ["2024-12-31"]])("accepts the real calendar date %s", (value) => {
    expect(isIsoDateString(value)).toBe(true)
  })

  it.each([["2023-02-29"], ["2024-02-30"], ["2024-04-31"], ["2024-13-01"], ["2024-00-10"]])(
    "rejects %s because the calendar rolls it over",
    (value) => {
      expect(isIsoDateString(value)).toBe(false)
    },
  )

  it.each([["2024-1-01"], ["24-01-01"], ["2024/01/01"], [""], ["2024-01-01T00:00"]])("rejects the malformed value %s", (value) => {
    expect(isIsoDateString(value)).toBe(false)
  })
})

describe("ISO date to local milliseconds", () => {
  it("anchors the date at local midnight, not UTC midnight", () => {
    const parsed = parseIsoDateToLocalDate("2024-03-05")

    expect(parsed.getFullYear()).toBe(2024)
    expect(parsed.getMonth()).toBe(2)
    expect(parsed.getDate()).toBe(5)
    expect(parsed.getHours()).toBe(0)
    expect(parsed.getMinutes()).toBe(0)
  })

  it("spans exactly one day minus a millisecond from start to end", () => {
    expect(parseIsoDateToEndMs("2024-03-05") - parseIsoDateToStartMs("2024-03-05")).toBe(MS_IN_DAY - 1)
  })

  it("ends the day at 23:59:59.999 local time", () => {
    const end = new Date(parseIsoDateToEndMs("2024-03-05"))

    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
    expect(end.getMilliseconds()).toBe(999)
  })

  it("orders consecutive days by their start milliseconds", () => {
    expect(parseIsoDateToStartMs("2024-03-05")).toBeLessThan(parseIsoDateToStartMs("2024-03-06"))
  })
})

describe("formatDateToIsoDateLocal", () => {
  it("pads single digit months and days", () => {
    expect(formatDateToIsoDateLocal(new Date(2024, 0, 9))).toBe("2024-01-09")
  })

  it("round trips through the local parser", () => {
    expect(formatDateToIsoDateLocal(parseIsoDateToLocalDate("2024-11-30"))).toBe("2024-11-30")
  })

  it("uses the local calendar day rather than the UTC one", () => {
    expect(formatDateToIsoDateLocal(new Date(2024, 5, 30, 23, 30))).toBe("2024-06-30")
  })
})
