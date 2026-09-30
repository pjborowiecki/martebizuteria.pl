import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { formatDateToIsoDateLocal, isIsoDateString, parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/modules/_core/utils/iso-date"
import {
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
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

export const resolveAdminDashboardChartStart = (referenceDate: Date, days: number): Date =>
  new Date(referenceDate.getTime() - (days - 1) * ADMIN_DASHBOARD_MS_PER_DAY)

export const resolveAdminDashboardMonthlyChartStart = (
  referenceDate: Date = new Date(),
  months: number = ADMIN_DASHBOARD_CHART_MONTHS_1Y,
): Date => new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (months - 1), 1)

export const resolveAdminDashboardYearStart = (referenceDate: Date = new Date()): Date => new Date(referenceDate.getFullYear(), 0, 1)

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

const formatChartDayLabel = (dateKey: string, locale: string): string => {
  const [yearPart, monthPart, dayPart] = dateKey.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  })
}

const formatWeekdayLabel = (dateKey: string, locale: string): string => {
  const [yearPart, monthPart, dayPart] = dateKey.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString(locale, {
    weekday: "short",
  })
}

export const buildAdminDashboardDailyChartPoints = ({
  days,
  locale = I18N.DEFAULT_LOCALE,
  referenceDate = new Date(),
  rows,
}: Readonly<{
  days: number
  locale?: string
  referenceDate?: Date
  rows: readonly DailyAggregateRow[]
}>): AdminDashboard["chartPoint"][] => {
  const rowByDateKey = new Map(rows.map((row) => [row.dateKey, row]))
  const points: AdminDashboard["chartPoint"][] = []
  for (let dayIndex = days - 1; dayIndex >= 0; dayIndex -= 1) {
    const date = new Date(referenceDate.getTime() - dayIndex * ADMIN_DASHBOARD_MS_PER_DAY)
    const dateKey = formatDateToIsoDateLocal(date)
    const aggregate = rowByDateKey.get(dateKey)
    points.push({
      dateKey,
      label: formatChartDayLabel(dateKey, locale),
      orders: aggregate?.orders ?? 0,
      revenue: aggregate?.revenue ?? 0,
    })
  }

  return points
}

const formatChartMonthLabel = (monthKey: string, locale: string): string => {
  const [yearPart, monthPart] = monthKey.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)
  const date = new Date(year, month - 1, 1)

  return date.toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
  })
}

const resolveMonthKey = (referenceDate: Date, monthsAgo: number): string => {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - monthsAgo, 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(ISO_MONTH_PAD_WIDTH, "0")

  return `${year}-${month}`
}

export const buildAdminDashboardMonthlyChartPoints = ({
  locale = I18N.DEFAULT_LOCALE,
  months = ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  referenceDate = new Date(),
  rows,
}: Readonly<{
  locale?: string
  months?: number
  referenceDate?: Date
  rows: readonly MonthlyAggregateRow[]
}>): AdminDashboard["chartPoint"][] => {
  const rowByMonthKey = new Map(rows.map((row) => [row.monthKey, row]))
  const points: AdminDashboard["chartPoint"][] = []
  for (let monthIndex = months - 1; monthIndex >= 0; monthIndex -= 1) {
    const monthKey = resolveMonthKey(referenceDate, monthIndex)
    const aggregate = rowByMonthKey.get(monthKey)
    points.push({
      dateKey: monthKey,
      label: formatChartMonthLabel(monthKey, locale),
      orders: aggregate?.orders ?? 0,
      revenue: aggregate?.revenue ?? 0,
    })
  }

  return points
}

export const isAdminDashboardCustomChartRangeValid = (startDate: string, endDate: string): boolean => {
  if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
    return false
  }

  return parseIsoDateToStartMs(startDate) <= parseIsoDateToEndMs(endDate)
}

export const buildAdminDashboardDailyChartPointsForIsoDateRange = ({
  endDate,
  locale = I18N.DEFAULT_LOCALE,
  rows,
  startDate,
}: Readonly<{
  endDate: string
  locale?: string
  rows: readonly DailyAggregateRow[]
  startDate: string
}>): AdminDashboard["chartPoint"][] => {
  const rowByDateKey = new Map(rows.map((row) => [row.dateKey, row]))
  const points: AdminDashboard["chartPoint"][] = []
  const startMs = parseIsoDateToStartMs(startDate)
  const endMs = parseIsoDateToStartMs(endDate)
  for (let cursorMs = startMs; cursorMs <= endMs; cursorMs += ADMIN_DASHBOARD_MS_PER_DAY) {
    const dateKey = formatDateToIsoDateLocal(new Date(cursorMs))
    const aggregate = rowByDateKey.get(dateKey)
    points.push({
      dateKey,
      label: formatChartDayLabel(dateKey, locale),
      orders: aggregate?.orders ?? 0,
      revenue: aggregate?.revenue ?? 0,
    })
  }

  return points
}

export const buildAdminDashboardWeeklyOrderPoints = ({
  locale = I18N.DEFAULT_LOCALE,
  referenceDate = new Date(),
  rows,
}: Readonly<{
  locale?: string
  referenceDate?: Date
  rows: readonly DailyAggregateRow[]
}>): AdminDashboard["weeklyOrderPoint"][] => {
  const dailyPoints = buildAdminDashboardDailyChartPoints({
    days: ADMIN_DASHBOARD_CHART_DAYS_7,
    locale,
    referenceDate,
    rows,
  })

  return dailyPoints.map((point) => ({
    dateKey: point.dateKey,
    dayLabel: formatWeekdayLabel(point.dateKey, locale),
    orders: point.orders,
  }))
}

const SINGLE_PRIOR_VALUE = 100

export interface AdminDashboardComparisonPeriod {
  readonly currentStart: Date
  readonly previousEnd: Date
  readonly previousStart: Date
}

interface DailyAggregateRow {
  readonly dateKey: string
  readonly orders: number
  readonly revenue: number
}

interface MonthlyAggregateRow {
  readonly monthKey: string
  readonly orders: number
  readonly revenue: number
}

const ISO_MONTH_PAD_WIDTH = 2
