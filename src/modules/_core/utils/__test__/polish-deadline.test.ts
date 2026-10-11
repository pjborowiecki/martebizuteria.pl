import { describe, expect, it } from "vite-plus/test"

import { polishDeadlineDay, toPolishCalendarDay } from "~/src/modules/_core/utils/polish-deadline"

const FOURTEEN_DAYS = 14

const calendarDay = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`)

describe("toPolishCalendarDay", () => {
  it("reads the date in Poland rather than in UTC, in summer and in winter time", () => {
    expect(toPolishCalendarDay(new Date("2026-10-03T22:30:00.000Z"))).toStrictEqual(calendarDay("2026-10-04"))
    expect(toPolishCalendarDay(new Date("2026-12-31T23:30:00.000Z"))).toStrictEqual(calendarDay("2027-01-01"))
    expect(toPolishCalendarDay(new Date("2026-12-31T22:59:59.999Z"))).toStrictEqual(calendarDay("2026-12-31"))
  })
})

describe("polishDeadlineDay", () => {
  it("ends the period on the fourteenth day after the event, whatever the hour of the event", () => {
    expect(polishDeadlineDay(new Date("2026-09-30T22:00:00.000Z"), FOURTEEN_DAYS)).toStrictEqual(calendarDay("2026-10-15"))
    expect(polishDeadlineDay(new Date("2026-10-01T21:59:59.999Z"), FOURTEEN_DAYS)).toStrictEqual(calendarDay("2026-10-15"))
  })

  it("counts from the day the event happened in Poland", () => {
    expect(polishDeadlineDay(new Date("2026-10-01T22:30:00.000Z"), FOURTEEN_DAYS)).toStrictEqual(calendarDay("2026-10-16"))
  })

  it.each([
    ["a Saturday", "2026-10-03T08:00:00.000Z", "2026-10-19"],
    ["Independence Day", "2026-10-28T10:00:00.000Z", "2026-11-12"],
    ["a Saturday followed by a Sunday and Constitution Day", "2027-04-17T10:00:00.000Z", "2027-05-04"],
    ["Christmas Eve on a Wednesday", "2031-12-10T10:00:00.000Z", "2031-12-29"],
    ["Easter Monday", "2027-03-15T10:00:00.000Z", "2027-03-30"],
    ["Corpus Christi", "2026-05-21T10:00:00.000Z", "2026-06-05"],
    ["Easter Monday after a paschal full moon moved to 18 April", "2019-04-08T10:00:00.000Z", "2019-04-23"],
    ["Easter Monday after a paschal full moon moved to 17 April", "2049-04-05T10:00:00.000Z", "2049-04-20"],
  ])("moves a period ending on %s to the end of the next working day", (_dayOff, startedAt, deadline) => {
    expect(polishDeadlineDay(new Date(startedAt), FOURTEEN_DAYS)).toStrictEqual(calendarDay(deadline))
  })
})
