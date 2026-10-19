import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { type CalendarPeriod, startOfCalendarDate, toCalendarDate } from "~/src/modules/_core/utils/datetime"
import { pageViewsQuery } from "~/src/modules/audit-log/audit-log.accessors"
import { orderAggregatesQuery } from "~/src/modules/order/order.accessors"
import {
  ADMIN_DASHBOARD_CHART_DAYS_30,
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_COMPARISON_PERIOD_DAYS,
  ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
  ADMIN_DASHBOARD_MONTH_LABEL_FORMAT,
  ADMIN_DASHBOARD_MS_PER_DAY,
  ADMIN_DASHBOARD_QUERY_KEYS,
  ADMIN_DASHBOARD_QUERY_STALE_MS,
  ADMIN_DASHBOARD_TREND_PERCENT_SCALE,
} from "~/src/modules/order/order.constants"
import { type AdminDashboard, type OrderAggregateRow } from "~/src/modules/order/order.types"
import {
  buildAdminDashboardChartPoints,
  resolveAdminDashboardDays,
  resolveAdminDashboardMonths,
  toAdminOrderListItem,
} from "~/src/modules/order/order.utils"
import { adminDashboardZodSchemas } from "~/src/modules/order/order.zod"
import {
  recentOrdersQuery,
  resolveTopProductCategoryLabel,
  resolveTopProductName,
  salesTotalsQuery,
  topProductsQuery,
} from "~/src/modules/order/use-cases/get-dashboard-snapshot.server"
import { newCustomersQuery } from "~/src/modules/user/user.accessors"

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

const SINGLE_PRIOR_VALUE = 100

export interface AdminDashboardComparisonPeriod {
  readonly currentStart: Date
  readonly previousEnd: Date
  readonly previousStart: Date
}

const WEEKDAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short" }

export const getDashboardSnapshot = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof adminDashboardZodSchemas.snapshotInput>) => adminDashboardZodSchemas.snapshotInput.parse(input))
  .handler(async ({ data: { locale } }): Promise<AdminDashboard["snapshot"]> => {
    const now = new Date()
    const { formatLocale, timeZone } = await resolveRequestDisplayPreferences()
    const { currentStart, previousEnd, previousStart } = resolveAdminDashboardComparisonPeriod(now)
    const days = resolveAdminDashboardDays(now, ADMIN_DASHBOARD_CHART_DAYS_30, timeZone)
    const months = resolveAdminDashboardMonths(now, ADMIN_DASHBOARD_CHART_MONTHS_1Y, timeZone)
    const yearStart = resolveAdminDashboardYearStart(now, timeZone)

    const [
      [currentSalesRow],
      [previousSalesRow],
      [currentCustomersRow],
      [previousCustomersRow],
      [currentViewsRow],
      [previousViewsRow],
      [yearToDateSalesRow],
      dailyAggregateRows,
      monthlyAggregateRows,
      recentOrderRows,
      topProductRows,
    ] = await db.batch([
      salesTotalsQuery(currentStart),
      salesTotalsQuery(previousStart, previousEnd),
      newCustomersQuery(currentStart),
      newCustomersQuery(previousStart, previousEnd),
      pageViewsQuery(currentStart),
      pageViewsQuery(previousStart, previousEnd),
      salesTotalsQuery(yearStart),
      orderAggregatesQuery(days),
      orderAggregatesQuery(months),
      recentOrdersQuery(),
      topProductsQuery(),
    ])

    const currencyCode = topProductRows[0]?.currencyCode ?? recentOrderRows[0]?.currencyCode ?? STORE_CURRENCY_CODE

    const chartPoints30d = buildAdminDashboardChartPoints({
      formatLocale,
      labelFormat: ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
      periods: days.periods,
      rows: dailyAggregateRows,
      timeZone,
    })

    const chartPoints7d = chartPoints30d.slice(-ADMIN_DASHBOARD_CHART_DAYS_7)
    const chartPoints1y = buildAdminDashboardChartPoints({
      formatLocale,
      labelFormat: ADMIN_DASHBOARD_MONTH_LABEL_FORMAT,
      periods: months.periods,
      rows: monthlyAggregateRows,
      timeZone,
    })

    return {
      averageOrderValue: buildAdminDashboardKpiStat(currentSalesRow?.averageOrderValue ?? 0, previousSalesRow?.averageOrderValue ?? 0),
      chartPoints1y,
      chartPoints30d,
      chartPoints7d,
      currencyCode,
      customers: buildAdminDashboardKpiStat(currentCustomersRow?.count ?? 0, previousCustomersRow?.count ?? 0),
      orders: buildAdminDashboardKpiStat(currentSalesRow?.orders ?? 0, previousSalesRow?.orders ?? 0),
      pageViews: buildAdminDashboardKpiStat(currentViewsRow?.count ?? 0, previousViewsRow?.count ?? 0),
      recentOrders: recentOrderRows.map((row) => toAdminOrderListItem({ ...row, itemCount: 0 })),
      revenue: buildAdminDashboardKpiStat(currentSalesRow?.revenue ?? 0, previousSalesRow?.revenue ?? 0),
      topProducts: topProductRows.map((row) => ({
        category: resolveTopProductCategoryLabel(row.categoryTitles, locale),
        currencyCode: row.currencyCode,
        imageUrl: row.thumbnail ?? undefined,
        name: resolveTopProductName(row.productTitles, row.title, locale),
        productId: row.productId,
        revenueMinorUnits: row.revenue,
        sold: row.sold,
      })),
      weeklyOrders: buildAdminDashboardWeeklyOrderPoints({
        formatLocale,
        periods: days.periods.slice(-ADMIN_DASHBOARD_CHART_DAYS_7),
        rows: dailyAggregateRows,
        timeZone,
      }),
      yearToDateRevenueMinorUnits: yearToDateSalesRow?.revenue ?? 0,
    }
  })

export const getDashboardSnapshotQuery = (input: zod.input<typeof adminDashboardZodSchemas.snapshotInput>) =>
  queryOptions({
    queryFn: () => getDashboardSnapshot({ data: input }),
    queryKey: [...ADMIN_DASHBOARD_QUERY_KEYS.SNAPSHOT, input.locale],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
  })
