import { type CalendarDateTime } from "~/src/modules/_core/utils/datetime"
import { JS_MONTH_INDEX_OFFSET, isIsoDateString, parseIsoDateToStartMs } from "~/src/modules/_core/utils/iso-date"

export const isTimeInputValue = (value: string): boolean => TIME_INPUT_PATTERN.test(value)

export const hasIsoDateTimeTimeComponent = (value: string): boolean => value.includes("T")

export const isIsoDateTimeLocalString = (value: string): boolean => {
  if (isIsoDateString(value)) {
    return true
  }

  if (!ISO_DATE_TIME_LOCAL_PATTERN.test(value)) {
    return false
  }

  return isIsoDateString(value.slice(0, value.indexOf("T")))
}

export const combineIsoDateAndTime = (date: string, time: string): string => {
  if (date === "") {
    return ""
  }

  if (time === "" || !isTimeInputValue(time)) {
    return date
  }

  return `${date}T${time}`
}

export const splitIsoDateTimeLocal = (
  value: string,
): {
  readonly date: string
  readonly time: string
} => {
  const [date, timePart] = value.split("T")
  if (date === undefined || timePart === undefined) {
    return { date: value, time: DEFAULT_TIME }
  }

  const [hours = "00", minutes = "00"] = timePart.split(":")

  return {
    date,
    time: `${hours}:${minutes}`,
  }
}

export const parseIsoDateTimeLocalToMs = (value: string): number => {
  if (isIsoDateString(value)) {
    return parseIsoDateToStartMs(value)
  }

  const [datePart, timePart] = value.split("T")
  if (datePart === undefined || timePart === undefined) {
    return Number.NaN
  }

  const [yearPart, monthPart, dayPart] = datePart.split("-")
  const [hoursPart, minutesPart, secondsPart = "0"] = timePart.split(":")
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  const hours = Number(hoursPart)
  const minutes = Number(minutesPart)
  const seconds = Number(secondsPart)

  return new Date(year, month - JS_MONTH_INDEX_OFFSET, day, hours, minutes, seconds).getTime()
}

export const parseIsoDateTimeLocal = (value: string): CalendarDateTime => {
  const { date, time } = splitIsoDateTimeLocal(value)
  const [yearPart, monthPart, dayPart] = date.split("-")
  const [hourPart, minutePart] = time.split(":")

  return { day: Number(dayPart), hour: Number(hourPart), minute: Number(minutePart), month: Number(monthPart), year: Number(yearPart) }
}

export const defaultDateTimeFilterEndTime = (): string => DEFAULT_END_TIME

const ISO_DATE_TIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u

const TIME_INPUT_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u

const DEFAULT_TIME = "00:00"

const DEFAULT_END_TIME = "23:59"
