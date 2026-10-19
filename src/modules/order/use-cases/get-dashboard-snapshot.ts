import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { pageViewsQuery } from "~/src/modules/audit-log/audit-log.accessors"
import {
  ADMIN_DASHBOARD_CHART_DAYS_30,
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_DAY_LABEL_FORMAT,
  ADMIN_DASHBOARD_MONTH_LABEL_FORMAT,
  ADMIN_DASHBOARD_QUERY_KEYS,
  ADMIN_DASHBOARD_QUERY_STALE_MS,
} from "~/src/modules/order/order.constants"
import {
  orderAggregatesQuery,
  recentOrdersQuery,
  resolveTopProductCategoryLabel,
  resolveTopProductName,
  salesTotalsQuery,
  topProductsQuery,
} from "~/src/modules/order/order.dashboard.accessors"
import {
  buildAdminDashboardChartPoints,
  buildAdminDashboardKpiStat,
  buildAdminDashboardWeeklyOrderPoints,
  resolveAdminDashboardComparisonPeriod,
  resolveAdminDashboardDays,
  resolveAdminDashboardMonths,
  resolveAdminDashboardYearStart,
} from "~/src/modules/order/order.dashboard.utils"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"
import { type AdminDashboard } from "~/src/modules/order/order.types"
import { adminDashboardZodSchemas } from "~/src/modules/order/order.zod"
import { newCustomersQuery } from "~/src/modules/user/user.accessors"

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
