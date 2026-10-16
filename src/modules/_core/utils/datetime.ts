import { I18N } from "~/src/integrations/use-intl/i18n.config"

export type DateInput = Date | string

export type NumericInput = number | string | bigint | null | undefined

const MS_PER = {
  day: 86_400_000,
  hour: 3_600_000,
  minute: 60_000,
} as const

const DAYS_PER_WEEK = 7

const SHORT_DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
}

const CALENDAR_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
}

const CALENDAR_PARTS_LOCALE = "en-US"

const ISO_DATE_PART_WIDTH = 2

const WALL_CLOCK_PARTS: Intl.DateTimeFormatOptions = {
  ...CALENDAR_PARTS,
  hour: "numeric",
  hourCycle: "h23",
  minute: "numeric",
  second: "numeric",
}

const TIMESTAMP_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  second: "2-digit",
  year: "numeric",
}

const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value))

export interface CalendarDate {
  readonly day: number
  readonly month: number
  readonly year: number
}

export interface CalendarDateTime extends CalendarDate {
  readonly hour: number
  readonly minute: number
}

export interface CalendarPeriod {
  readonly key: string
  readonly start: Date
}

const readNumericParts = (value: DateInput, options: Intl.DateTimeFormatOptions): ((type: Intl.DateTimeFormatPartTypes) => number) => {
  const parts = new Intl.DateTimeFormat(CALENDAR_PARTS_LOCALE, options).formatToParts(toDate(value))

  return (type) => Number(parts.find((part) => part.type === type)?.value)
}

export const toCalendarDate = (value: DateInput, timeZone: string): CalendarDate => {
  const numberOf = readNumericParts(value, { ...CALENDAR_PARTS, timeZone })

  return { day: numberOf("day"), month: numberOf("month"), year: numberOf("year") }
}

export const normalizeCalendarDate = ({ day, month, year }: CalendarDate): CalendarDate =>
  toCalendarDate(new Date(Date.UTC(year, month - 1, day)), "UTC")

const timeZoneOffsetMs = (instantMs: number, timeZone: string): number => {
  const numberOf = readNumericParts(new Date(instantMs), { ...WALL_CLOCK_PARTS, timeZone })

  return (
    Date.UTC(numberOf("year"), numberOf("month") - 1, numberOf("day"), numberOf("hour"), numberOf("minute"), numberOf("second")) - instantMs
  )
}

export const instantOfWallClock = ({ day, hour, minute, month, year }: CalendarDateTime, timeZone: string): Date => {
  const wallClockAsUtcMs = Date.UTC(year, month - 1, day, hour, minute)
  const estimatedInstantMs = wallClockAsUtcMs - timeZoneOffsetMs(wallClockAsUtcMs, timeZone)

  return new Date(wallClockAsUtcMs - timeZoneOffsetMs(estimatedInstantMs, timeZone))
}

export const startOfCalendarDate = (date: CalendarDate, timeZone: string): Date =>
  instantOfWallClock({ ...date, hour: 0, minute: 0 }, timeZone)

const padIsoDatePart = (value: number): string => String(value).padStart(ISO_DATE_PART_WIDTH, "0")

export const formatCalendarDateToIsoDate = ({ day, month, year }: CalendarDate): string =>
  `${String(year)}-${padIsoDatePart(month)}-${padIsoDatePart(day)}`

export const formatShortDate = (value: DateInput, locale: string = I18N.DEFAULT_LOCALE, timeZone?: string): string =>
  toDate(value).toLocaleDateString(locale, timeZone === undefined ? SHORT_DATE_PARTS : { ...SHORT_DATE_PARTS, timeZone })

export const formatTimestamp = (value: DateInput, locale: string = I18N.DEFAULT_LOCALE): string =>
  toDate(value).toLocaleString(locale, TIMESTAMP_PARTS)

export const formatRelativeFromNow = (value: DateInput, locale: string, nowMs: number = Date.now()): string => {
  const date = toDate(value)
  const elapsedMs = nowMs - date.getTime()
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  if (elapsedMs < MS_PER.minute) {
    return relative.format(0, "second")
  }

  if (elapsedMs < MS_PER.hour) {
    return relative.format(-Math.floor(elapsedMs / MS_PER.minute), "minute")
  }

  if (elapsedMs < MS_PER.day) {
    return relative.format(-Math.floor(elapsedMs / MS_PER.hour), "hour")
  }

  if (elapsedMs < MS_PER.day * DAYS_PER_WEEK) {
    return relative.format(-Math.floor(elapsedMs / MS_PER.day), "day")
  }

  return formatShortDate(date, locale)
}

export const coerceNumber = (value: NumericInput): number => (value === null || value === undefined ? 0 : Number(value))
