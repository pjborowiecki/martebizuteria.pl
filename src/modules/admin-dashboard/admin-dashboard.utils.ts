import { DEFAULT_TIMEZONE_CODE } from "~/src/modules/_core/constants/timezone"
import {
  type CalendarDate,
  type CalendarPeriod,
  normalizeCalendarDate,
  startOfCalendarDate,
  toCalendarDate,
} from "~/src/modules/_core/utils/datetime"
import { isIsoDateString, parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/modules/_core/utils/iso-date"
import {
  ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS,
  ADMIN_DASHBOARD_MS_PER_DAY,
  ADMIN_DASHBOARD_TREND_PERCENT_SCALE,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { type AdminDashboard } from "~/src/modules/admin-dashboard/admin-dashboard.types"

export const resolveAdminDashboardComparisonPeriod = (
  referenceDate: Date = new Date(),
  periodDays: number = ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS,
): AdminDashboardComparisonPeriod => {
  const currentStart = new Date(referenceDate.getTime() - periodDays * ADMIN_DASHBOARD_MS_PER_DAY)
  const comparisonPeriodMultiplier = 2
  const previousStart = new Date(referenceDate.getTime() - periodDays * comparisonPeriodMultiplier * ADMIN_DASHBOARD_MS_PER_DAY)

  return {
    currentStart,
    previousEnd: currentStart,
    previousStart,
  }
}

export interface AdminDashboardChartWindow {
  readonly end: Date
  readonly periods: readonly CalendarPeriod[]
  readonly start: Date
}

const padDatePart = (value: number): string => String(value).padStart(DATE_PART_WIDTH, "0")

const toMonthKey = ({ month, year }: CalendarDate): string => `${String(year)}-${padDatePart(month)}`

const toDayKey = (date: CalendarDate): string => `${toMonthKey(date)}-${padDatePart(date.day)}`

const buildChartWindow = (
  count: number,
  dateAt: (index: number) => CalendarDate,
  keyOf: (date: CalendarDate) => string,
): AdminDashboardChartWindow => {
  const periods = Array.from({ length: count }, (_, index) => {
    const date = dateAt(index)

    return { key: keyOf(date), start: startOfCalendarDate(date, DEFAULT_TIMEZONE_CODE) }
  })

  return {
    end: startOfCalendarDate(dateAt(count), DEFAULT_TIMEZONE_CODE),
    periods,
    start: startOfCalendarDate(dateAt(0), DEFAULT_TIMEZONE_CODE),
  }
}

const buildDayWindow = (first: CalendarDate, count: number): AdminDashboardChartWindow =>
  buildChartWindow(count, (index) => normalizeCalendarDate({ ...first, day: first.day + index }), toDayKey)

export const resolveAdminDashboardDays = (referenceDate: Date, count: number): AdminDashboardChartWindow => {
  const today = toCalendarDate(referenceDate, DEFAULT_TIMEZONE_CODE)

  return buildDayWindow({ ...today, day: today.day + 1 - count }, count)
}

export const resolveAdminDashboardDateRange = (startDate: string, endDate: string): AdminDashboardChartWindow => {
  const dayCount = (Date.parse(endDate) - Date.parse(startDate)) / ADMIN_DASHBOARD_MS_PER_DAY + 1

  return buildDayWindow(toCalendarDate(startDate, "UTC"), dayCount)
}

export const resolveAdminDashboardMonths = (referenceDate: Date, count: number): AdminDashboardChartWindow => {
  const { month, year } = toCalendarDate(referenceDate, DEFAULT_TIMEZONE_CODE)

  return buildChartWindow(count, (index) => normalizeCalendarDate({ day: 1, month: month + 1 - count + index, year }), toMonthKey)
}

export const resolveAdminDashboardYearStart = (referenceDate: Date): Date =>
  startOfCalendarDate({ day: 1, month: 1, year: toCalendarDate(referenceDate, DEFAULT_TIMEZONE_CODE).year }, DEFAULT_TIMEZONE_CODE)

export const computeAdminDashboardTrendPercent = (current: number, previous: number): number => {
  if (previous <= 0) {
    return current > 0 ? SINGLE_PRIOR_VALUE : 0
  }

  return Math.round(((current - previous) / previous) * ADMIN_DASHBOARD_TREND_PERCENT_SCALE)
}

export const buildAdminDashboardKpiStat = (current: number, previous: number): AdminDashboard["kpiStat"] => ({
  current,
  previous,
  trendPercent: computeAdminDashboardTrendPercent(current, previous),
})

export const buildAdminDashboardChartPoints = ({
  labelFormat,
  locale,
  periods,
  rows,
}: Readonly<{
  labelFormat: Intl.DateTimeFormatOptions
  locale: string
  periods: readonly CalendarPeriod[]
  rows: readonly OrderAggregateRow[]
}>): AdminDashboard["chartPoint"][] => {
  const rowByPeriodKey = new Map(rows.map((row) => [row.periodKey, row]))

  return periods.map(({ key, start }) => {
    const point = {
      dateKey: key,
      label: start.toLocaleDateString(locale, { ...labelFormat, timeZone: DEFAULT_TIMEZONE_CODE }),
      orders: 0,
      revenue: 0,
    }
    const aggregate = rowByPeriodKey.get(key)

    return aggregate === undefined ? point : { ...point, orders: aggregate.orders, revenue: aggregate.revenue }
  })
}

export const buildAdminDashboardWeeklyOrderPoints = ({
  locale,
  periods,
  rows,
}: Readonly<{
  locale: string
  periods: readonly CalendarPeriod[]
  rows: readonly OrderAggregateRow[]
}>): AdminDashboard["weeklyOrderPoint"][] =>
  buildAdminDashboardChartPoints({ labelFormat: WEEKDAY_LABEL_FORMAT, locale, periods, rows }).map(({ dateKey, label, orders }) => ({
    dateKey,
    dayLabel: label,
    orders,
  }))

export const isAdminDashboardCustomChartRangeValid = (startDate: string, endDate: string): boolean => {
  if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
    return false
  }

  return parseIsoDateToStartMs(startDate) <= parseIsoDateToEndMs(endDate)
}

const SINGLE_PRIOR_VALUE = 100

export interface AdminDashboardComparisonPeriod {
  readonly currentStart: Date
  readonly previousEnd: Date
  readonly previousStart: Date
}

interface OrderAggregateRow {
  readonly orders: number
  readonly periodKey: string
  readonly revenue: number
}

const DATE_PART_WIDTH = 2

const WEEKDAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short" }
