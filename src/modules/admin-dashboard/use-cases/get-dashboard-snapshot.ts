import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import {
  averageCompletedOrderValueQuery,
  completedRevenueSumQuery,
  countableOrdersQuery,
  dailyOrderAggregatesQuery,
  monthlyOrderAggregatesQuery,
  newCustomersQuery,
  pageViewsQuery,
  recentOrdersQuery,
  resolveTopProductCategoryLabel,
  resolveTopProductName,
  topProductsQuery,
} from "~/src/modules/admin-dashboard/admin-dashboard.accessors"
import {
  ADMIN_DASHBOARD_CHART_DAYS_30,
  ADMIN_DASHBOARD_CHART_DAYS_7,
  ADMIN_DASHBOARD_CHART_MONTHS_1Y,
  ADMIN_DASHBOARD_QUERY_KEYS,
  ADMIN_DASHBOARD_QUERY_STALE_MS,
} from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { type AdminDashboardSnapshot } from "~/src/modules/admin-dashboard/admin-dashboard.types"
import {
  buildAdminDashboardDailyChartPoints,
  buildAdminDashboardKpiStat,
  buildAdminDashboardMonthlyChartPoints,
  buildAdminDashboardWeeklyOrderPoints,
  resolveAdminDashboardChartStart,
  resolveAdminDashboardComparisonPeriod,
  resolveAdminDashboardMonthlyChartStart,
  resolveAdminDashboardYearStart,
} from "~/src/modules/admin-dashboard/admin-dashboard.utils"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"

export interface AdminDashboardInput {
  readonly locale: string
}

export const fetchAdminDashboardSnapshotFn = createServerFn({ method: "GET" })
  .validator((input: AdminDashboardInput) => input)
  .handler(async ({ data: { locale } }): Promise<AdminDashboardSnapshot> => {
    await assertAdmin()
    const now = new Date()
    const { currentStart, previousEnd, previousStart } = resolveAdminDashboardComparisonPeriod(now)
    const chartStart = resolveAdminDashboardChartStart(now, ADMIN_DASHBOARD_CHART_DAYS_30)
    const monthlyChartStart = resolveAdminDashboardMonthlyChartStart(now, ADMIN_DASHBOARD_CHART_MONTHS_1Y)
    const yearStart = resolveAdminDashboardYearStart(now)

    const [
      [currentRevenueRow],
      [previousRevenueRow],
      [currentOrdersRow],
      [previousOrdersRow],
      [currentCustomersRow],
      [previousCustomersRow],
      [currentViewsRow],
      [previousViewsRow],
      [currentAverageRow],
      [previousAverageRow],
      [yearToDateRevenueRow],
      dailyAggregateRows,
      monthlyAggregateRows,
      recentOrderRows,
      topProductRows,
    ] = await db.batch([
      completedRevenueSumQuery(currentStart),
      completedRevenueSumQuery(previousStart, previousEnd),
      countableOrdersQuery(currentStart),
      countableOrdersQuery(previousStart, previousEnd),
      newCustomersQuery(currentStart),
      newCustomersQuery(previousStart, previousEnd),
      pageViewsQuery(currentStart),
      pageViewsQuery(previousStart, previousEnd),
      averageCompletedOrderValueQuery(currentStart),
      averageCompletedOrderValueQuery(previousStart, previousEnd),
      completedRevenueSumQuery(yearStart),
      dailyOrderAggregatesQuery(chartStart),
      monthlyOrderAggregatesQuery(monthlyChartStart),
      recentOrdersQuery(),
      topProductsQuery(),
    ])

    const currencyCode = topProductRows[0]?.currencyCode ?? recentOrderRows[0]?.currencyCode ?? STORE_CURRENCY_CODE

    const chartPoints30d = buildAdminDashboardDailyChartPoints({
      days: ADMIN_DASHBOARD_CHART_DAYS_30,
      locale,
      referenceDate: now,
      rows: dailyAggregateRows,
    })

    const chartPoints7d = chartPoints30d.slice(-ADMIN_DASHBOARD_CHART_DAYS_7)
    const chartPoints1y = buildAdminDashboardMonthlyChartPoints({
      locale,
      months: ADMIN_DASHBOARD_CHART_MONTHS_1Y,
      referenceDate: now,
      rows: monthlyAggregateRows,
    })
    const validTopProductRows = topProductRows.filter((row): row is typeof row & { productId: string } => row.productId !== null)

    return {
      averageOrderValue: buildAdminDashboardKpiStat(currentAverageRow?.average ?? 0, previousAverageRow?.average ?? 0),
      chartPoints1y,
      chartPoints30d,
      chartPoints7d,
      currencyCode,
      customers: buildAdminDashboardKpiStat(currentCustomersRow?.count ?? 0, previousCustomersRow?.count ?? 0),
      orders: buildAdminDashboardKpiStat(currentOrdersRow?.count ?? 0, previousOrdersRow?.count ?? 0),
      pageViews: buildAdminDashboardKpiStat(currentViewsRow?.count ?? 0, previousViewsRow?.count ?? 0),
      recentOrders: recentOrderRows.map((row) =>
        toAdminOrderListItem({
          createdAt: row.createdAt,
          currencyCode: row.currencyCode,
          customerName: row.customerName,
          email: row.email,
          fulfillmentStatus: row.fulfillmentStatus,
          id: row.id,
          itemCount: 0,
          paymentStatus: row.paymentStatus,
          status: row.status,
          total: row.total,
          userId: row.userId,
        }),
      ),
      revenue: buildAdminDashboardKpiStat(currentRevenueRow?.total ?? 0, previousRevenueRow?.total ?? 0),
      topProducts: validTopProductRows.map((row) => ({
        category: resolveTopProductCategoryLabel(row.categoryTitles, locale),
        currencyCode: row.currencyCode,
        imageUrl: row.thumbnail ?? undefined,
        name: resolveTopProductName(row.productTitles, row.title, locale),
        productId: row.productId,
        revenueMinorUnits: row.revenue,
        sold: row.sold,
      })),
      weeklyOrders: buildAdminDashboardWeeklyOrderPoints({
        locale,
        referenceDate: now,
        rows: dailyAggregateRows,
      }),
      yearToDateRevenueMinorUnits: yearToDateRevenueRow?.total ?? 0,
    }
  })

export const adminDashboardSnapshotQueryOptions = (input: AdminDashboardInput) =>
  queryOptions({
    queryFn: () => fetchAdminDashboardSnapshotFn({ data: input }),
    queryKey: [...ADMIN_DASHBOARD_QUERY_KEYS.SNAPSHOT, input.locale] as const,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ADMIN_DASHBOARD_QUERY_STALE_MS,
  })
