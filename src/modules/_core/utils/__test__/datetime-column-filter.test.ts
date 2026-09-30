import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import {
  dateTimeFilterDraftFromValue,
  dateTimeFilterValueFromDraft,
  emptyDateTimeFilterDraft,
  formatDateTimeFilterTriggerLabel,
  isDateTimeFilterDraftValid,
  isDateTimeFilterRangeValid,
} from "~/src/modules/_core/utils/datetime-column-filter"

describe("emptyDateTimeFilterDraft", () => {
  it("starts on the single-date operator with every field blank", () => {
    expect(emptyDateTimeFilterDraft()).toStrictEqual({
      date: "",
      endDate: "",
      endTime: "",
      operator: DATE_COLUMN_FILTER_OPERATOR.ON,
      startDate: "",
      startTime: "",
      time: "",
    })
  })

  it("keeps the operator the caller chose", () => {
    expect(emptyDateTimeFilterDraft(DATE_COLUMN_FILTER_OPERATOR.BETWEEN).operator).toBe(DATE_COLUMN_FILTER_OPERATOR.BETWEEN)
  })
})

describe("isDateTimeFilterRangeValid", () => {
  it("accepts an ordered range and an identical pair of instants", () => {
    expect(isDateTimeFilterRangeValid("2024-03-05T10:00", "2024-03-05T18:00")).toBe(true)
    expect(isDateTimeFilterRangeValid("2024-03-05T10:00", "2024-03-05T10:00")).toBe(true)
  })

  it("rejects a range that runs backwards within the same day", () => {
    expect(isDateTimeFilterRangeValid("2024-03-05T18:00", "2024-03-05T10:00")).toBe(false)
  })

  it("rejects endpoints that are not local datetimes", () => {
    expect(isDateTimeFilterRangeValid("2024-03-05T10", "2024-03-05T18:00")).toBe(false)
    expect(isDateTimeFilterRangeValid("", "2024-03-05T18:00")).toBe(false)
  })
})

describe("draft round trip", () => {
  it("falls back to an empty draft when nothing is filtered", () => {
    expect(dateTimeFilterDraftFromValue(undefined)).toStrictEqual(emptyDateTimeFilterDraft())
  })

  it("splits a single instant into its date and time fields", () => {
    expect(dateTimeFilterDraftFromValue({ date: "2024-03-05T10:30", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE })).toStrictEqual({
      date: "2024-03-05",
      endDate: "",
      endTime: "",
      operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE,
      startDate: "",
      startTime: "",
      time: "10:30",
    })
  })

  it("splits both endpoints of a range", () => {
    const draft = dateTimeFilterDraftFromValue({
      endDate: "2024-03-09T18:45",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-03-05T10:30",
    })

    expect(draft.startDate).toBe("2024-03-05")
    expect(draft.startTime).toBe("10:30")
    expect(draft.endDate).toBe("2024-03-09")
    expect(draft.endTime).toBe("18:45")
    expect(draft.date).toBe("")
  })

  it("defaults a date-only stored value to the start of the day", () => {
    expect(dateTimeFilterDraftFromValue({ date: "2024-03-05", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).time).toBe("00:00")
  })

  it("rebuilds the stored value from the draft", () => {
    const value = { date: "2024-03-05T10:30", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER }

    expect(dateTimeFilterValueFromDraft(dateTimeFilterDraftFromValue(value))).toStrictEqual(value)
  })

  it("rebuilds a range value from the draft", () => {
    const value = {
      endDate: "2024-03-09T18:45",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-03-05T10:30",
    }

    expect(dateTimeFilterValueFromDraft(dateTimeFilterDraftFromValue(value))).toStrictEqual(value)
  })
})

describe("isDateTimeFilterDraftValid", () => {
  const base = emptyDateTimeFilterDraft()

  it("rejects an untouched draft", () => {
    expect(isDateTimeFilterDraftValid(base)).toBe(false)
  })

  it("requires both a real date and a zero padded time for a single instant", () => {
    expect(isDateTimeFilterDraftValid({ ...base, date: "2024-03-05", time: "10:30" })).toBe(true)
    expect(isDateTimeFilterDraftValid({ ...base, date: "2024-03-05", time: "" })).toBe(false)
    expect(isDateTimeFilterDraftValid({ ...base, date: "2024-02-30", time: "10:30" })).toBe(false)
    expect(isDateTimeFilterDraftValid({ ...base, date: "2024-03-05T10:30", time: "10:30" })).toBe(false)
  })

  it("requires both endpoints and an ordered range for between", () => {
    const range = {
      ...base,
      endDate: "2024-03-09",
      endTime: "18:45",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-03-05",
      startTime: "10:30",
    }

    expect(isDateTimeFilterDraftValid(range)).toBe(true)
    expect(isDateTimeFilterDraftValid({ ...range, endDate: "" })).toBe(false)
    expect(isDateTimeFilterDraftValid({ ...range, endTime: "6:45" })).toBe(false)
    expect(isDateTimeFilterDraftValid({ ...range, endDate: "2024-03-01" })).toBe(false)
  })

  it("accepts a same-day range ordered only by its time fields", () => {
    const sameDay = {
      ...base,
      endDate: "2024-03-05",
      endTime: "18:45",
      operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
      startDate: "2024-03-05",
      startTime: "10:30",
    }

    expect(isDateTimeFilterDraftValid(sameDay)).toBe(true)
    expect(isDateTimeFilterDraftValid({ ...sameDay, startTime: "23:00" })).toBe(false)
  })
})

const formatIsoDateTimeLabel = (value: string): string => `[${value}]`

describe("formatDateTimeFilterTriggerLabel", () => {
  it("shows the idle label when nothing is filtered", () => {
    expect(formatDateTimeFilterTriggerLabel({ activeFilter: undefined, formatIsoDateTimeLabel, idleLabel: "Any time" })).toBe("Any time")
  })

  it("shows both endpoints of a range", () => {
    expect(
      formatDateTimeFilterTriggerLabel({
        activeFilter: { endDate: "2024-03-09T18:45", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-03-05T10:30" },
        formatIsoDateTimeLabel,
        idleLabel: "Any time",
      }),
    ).toBe("[2024-03-05T10:30] – [2024-03-09T18:45]")
  })

  it("prefixes a single instant with its operator symbol", () => {
    expect(
      formatDateTimeFilterTriggerLabel({
        activeFilter: { date: "2024-03-05T10:30", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE },
        formatIsoDateTimeLabel,
        idleLabel: "Any time",
      }),
    ).toBe("< [2024-03-05T10:30]")
  })

  it("falls back to the idle label for a half-built filter", () => {
    expect(
      formatDateTimeFilterTriggerLabel({
        activeFilter: { operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-03-05T10:30" },
        formatIsoDateTimeLabel,
        idleLabel: "Any time",
      }),
    ).toBe("Any time")
  })
})

it("initializes incomplete range bounds without inventing dates", () => {
  expect(dateTimeFilterDraftFromValue({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN })).toMatchObject({
    endDate: "",
    endTime: "00:00",
    startDate: "",
    startTime: "00:00",
  })
})

it("initializes an incomplete single-date filter without inventing a date", () => {
  expect(dateTimeFilterDraftFromValue({ operator: DATE_COLUMN_FILTER_OPERATOR.AFTER })).toMatchObject({ date: "", time: "00:00" })
})

it("rejects an invalid range end after a valid start", () => {
  expect(isDateTimeFilterRangeValid("2024-03-05T10:00", "bad-date")).toBe(false)
})
