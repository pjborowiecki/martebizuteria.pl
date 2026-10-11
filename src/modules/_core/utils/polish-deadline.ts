import { DEFAULT_TIMEZONE_CODE } from "~/src/modules/_core/constants/timezone"
import { type CalendarDate, toCalendarDate } from "~/src/modules/_core/utils/datetime"
import { JS_MONTH_INDEX_OFFSET } from "~/src/modules/_core/utils/iso-date"

const SUNDAY = 0

const SATURDAY = 6

const DAYS_PER_WEEK = 7

const FIXED_PUBLIC_HOLIDAYS: readonly Omit<CalendarDate, "year">[] = [
  { day: 1, month: 1 },
  { day: 6, month: 1 },
  { day: 1, month: 5 },
  { day: 3, month: 5 },
  { day: 15, month: 8 },
  { day: 1, month: 11 },
  { day: 11, month: 11 },
  { day: 24, month: 12 },
  { day: 25, month: 12 },
  { day: 26, month: 12 },
]

const PUBLIC_HOLIDAYS_AFTER_EASTER_SUNDAY = {
  CORPUS_CHRISTI: 60,
  EASTER_MONDAY: 1,
  EASTER_SUNDAY: 0,
  PENTECOST: 49,
} as const

const GREGORIAN_COMPUTUS = {
  CENTURIES_PER_LEAP_CENTURY: 4,
  EPACT_CYCLE_DAYS: 30,
  EPACT_OFFSET: 15,
  EQUINOX_DAY: 21,
  EQUINOX_MONTH: 3,
  LAST_METONIC_YEAR_WITHOUT_EARLY_FULL_MOON: 10,
  LATEST_FULL_MOON_DAY: 29,
  LUNAR_CORRECTION_OFFSET: 8,
  LUNAR_CORRECTION_PERIOD_CENTURIES: 25,
  LUNAR_CORRECTION_STEP_CENTURIES: 3,
  METONIC_CYCLE_YEARS: 19,
  YEARS_PER_CENTURY: 100,
} as const

const addDays = (calendarDay: Date, days: number): Date =>
  new Date(Date.UTC(calendarDay.getUTCFullYear(), calendarDay.getUTCMonth(), calendarDay.getUTCDate() + days))

const paschalFullMoon = (year: number): Date => {
  const metonicYear = year % GREGORIAN_COMPUTUS.METONIC_CYCLE_YEARS
  const century = Math.floor(year / GREGORIAN_COMPUTUS.YEARS_PER_CENTURY)
  const solarCorrection = century - Math.floor(century / GREGORIAN_COMPUTUS.CENTURIES_PER_LEAP_CENTURY)
  const lunarCorrectionDelay = Math.floor(
    (century + GREGORIAN_COMPUTUS.LUNAR_CORRECTION_OFFSET) / GREGORIAN_COMPUTUS.LUNAR_CORRECTION_PERIOD_CENTURIES,
  )
  const lunarCorrection = Math.floor((century - lunarCorrectionDelay + 1) / GREGORIAN_COMPUTUS.LUNAR_CORRECTION_STEP_CENTURIES)
  const daysAfterEquinox =
    (GREGORIAN_COMPUTUS.METONIC_CYCLE_YEARS * metonicYear + solarCorrection - lunarCorrection + GREGORIAN_COMPUTUS.EPACT_OFFSET) %
    GREGORIAN_COMPUTUS.EPACT_CYCLE_DAYS
  const movesOneDayEarlier =
    daysAfterEquinox === GREGORIAN_COMPUTUS.LATEST_FULL_MOON_DAY ||
    (daysAfterEquinox === GREGORIAN_COMPUTUS.LATEST_FULL_MOON_DAY - 1 &&
      metonicYear > GREGORIAN_COMPUTUS.LAST_METONIC_YEAR_WITHOUT_EARLY_FULL_MOON)

  return new Date(
    Date.UTC(
      year,
      GREGORIAN_COMPUTUS.EQUINOX_MONTH - JS_MONTH_INDEX_OFFSET,
      GREGORIAN_COMPUTUS.EQUINOX_DAY + daysAfterEquinox - (movesOneDayEarlier ? 1 : 0),
    ),
  )
}

const easterSunday = (year: number): Date => {
  const fullMoon = paschalFullMoon(year)

  return addDays(fullMoon, DAYS_PER_WEEK - fullMoon.getUTCDay())
}

const isNonWorkingDay = (calendarDay: Date): boolean => {
  const easter = easterSunday(calendarDay.getUTCFullYear())

  return (
    calendarDay.getUTCDay() === SATURDAY ||
    calendarDay.getUTCDay() === SUNDAY ||
    FIXED_PUBLIC_HOLIDAYS.some(
      ({ day, month }) => day === calendarDay.getUTCDate() && month === calendarDay.getUTCMonth() + JS_MONTH_INDEX_OFFSET,
    ) ||
    Object.values(PUBLIC_HOLIDAYS_AFTER_EASTER_SUNDAY).some(
      (daysAfterEaster) => addDays(easter, daysAfterEaster).getTime() === calendarDay.getTime(),
    )
  )
}

const firstWorkingDayFrom = (calendarDay: Date): Date =>
  isNonWorkingDay(calendarDay) ? firstWorkingDayFrom(addDays(calendarDay, 1)) : calendarDay

export const toPolishCalendarDay = (instant: Date): Date => {
  const { day, month, year } = toCalendarDate(instant, DEFAULT_TIMEZONE_CODE)

  return new Date(Date.UTC(year, month - JS_MONTH_INDEX_OFFSET, day))
}

export const polishDeadlineDay = (startedAt: Date, periodDays: number): Date =>
  firstWorkingDayFrom(addDays(toPolishCalendarDay(startedAt), periodDays))
