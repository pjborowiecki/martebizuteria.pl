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

const TIMESTAMP_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  second: "2-digit",
  year: "numeric",
}

const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value))

export const formatShortDate = (value: DateInput, locale: string = I18N.DEFAULT_LOCALE): string =>
  toDate(value).toLocaleDateString(locale, SHORT_DATE_PARTS)

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
