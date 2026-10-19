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
} from "~/src/modules/order/order.constants"
import { type AdminDashboard } from "~/src/modules/order/order.types"

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

interface ChartWindowInput {
  readonly count: number
  readonly dateAt: (index: number) => CalendarDate
  readonly keyOf: (date: CalendarDate) => string
  readonly timeZone: string
}

export interface AdminDashboardChartWindow {
  readonly end: Date
  readonly periods: readonly CalendarPeriod[]
  readonly start: Date
}

const padDatePart = (value: number): string => String(value).padStart(DATE_PART_WIDTH, "0")

const toMonthKey = ({ month, year }: CalendarDate): string => `${String(year)}-${padDatePart(month)}`

const toDayKey = (date: CalendarDate): string => `${toMonthKey(date)}-${padDatePart(date.day)}`

const buildChartWindow = ({ count, dateAt, keyOf, timeZone }: ChartWindowInput): AdminDashboardChartWindow => {
  const periods = Array.from({ length: count }, (_, index) => {
    const date = dateAt(index)

    return { key: keyOf(date), start: startOfCalendarDate(date, timeZone) }
  })

  return {
    end: startOfCalendarDate(dateAt(count), timeZone),
    periods,
    start: startOfCalendarDate(dateAt(0), timeZone),
  }
}

const buildDayWindow = (first: CalendarDate, count: number, timeZone: string): AdminDashboardChartWindow =>
  buildChartWindow({ count, dateAt: (index) => normalizeCalendarDate({ ...first, day: first.day + index }), keyOf: toDayKey, timeZone })

export const resolveAdminDashboardDays = (referenceDate: Date, count: number, timeZone: string): AdminDashboardChartWindow => {
  const today = toCalendarDate(referenceDate, timeZone)

  return buildDayWindow({ ...today, day: today.day + 1 - count }, count, timeZone)
}

export const resolveAdminDashboardDateRange = (startDate: string, endDate: string, timeZone: string): AdminDashboardChartWindow => {
  const dayCount = (Date.parse(endDate) - Date.parse(startDate)) / ADMIN_DASHBOARD_MS_PER_DAY + 1

  return buildDayWindow(toCalendarDate(startDate, "UTC"), dayCount, timeZone)
}

export const resolveAdminDashboardMonths = (referenceDate: Date, count: number, timeZone: string): AdminDashboardChartWindow => {
  const { month, year } = toCalendarDate(referenceDate, timeZone)

  return buildChartWindow({
    count,
    dateAt: (index) => normalizeCalendarDate({ day: 1, month: month + 1 - count + index, year }),
    keyOf: toMonthKey,
    timeZone,
  })
}

export const resolveAdminDashboardYearStart = (referenceDate: Date, timeZone: string): Date =>
  startOfCalendarDate({ day: 1, month: 1, year: toCalendarDate(referenceDate, timeZone).year }, timeZone)

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
  formatLocale,
  labelFormat,
  periods,
  rows,
  timeZone,
}: Readonly<{
  formatLocale: string
  labelFormat: Intl.DateTimeFormatOptions
  periods: readonly CalendarPeriod[]
  rows: readonly OrderAggregateRow[]
  timeZone: string
}>): AdminDashboard["chartPoint"][] => {
  const rowByPeriodKey = new Map(rows.map((row) => [row.periodKey, row]))

  return periods.map(({ key, start }) => {
    const point = {
      dateKey: key,
      label: start.toLocaleDateString(formatLocale, { ...labelFormat, timeZone }),
      orders: 0,
      revenue: 0,
    }
    const aggregate = rowByPeriodKey.get(key)

    return aggregate === undefined ? point : { ...point, orders: aggregate.orders, revenue: aggregate.revenue }
  })
}

export const buildAdminDashboardWeeklyOrderPoints = ({
  formatLocale,
  periods,
  rows,
  timeZone,
}: Readonly<{
  formatLocale: string
  periods: readonly CalendarPeriod[]
  rows: readonly OrderAggregateRow[]
  timeZone: string
}>): AdminDashboard["weeklyOrderPoint"][] =>
  buildAdminDashboardChartPoints({ formatLocale, labelFormat: WEEKDAY_LABEL_FORMAT, periods, rows, timeZone }).map(
    ({ dateKey, label, orders }) => ({
      dateKey,
      dayLabel: label,
      orders,
    }),
  )

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
